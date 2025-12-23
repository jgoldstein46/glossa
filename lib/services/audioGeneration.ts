import { SupabaseClient } from '@supabase/supabase-js'
import { elevenlabs, MODEL_ID } from '@/lib/elevenlabs/client'
import { getVoiceForLanguage } from '@/lib/elevenlabs/voices'

export interface AudioGenerationResult {
  success: boolean
  audioUrl?: string
  error?: string
}

/**
 * Convert a ReadableStream to a Buffer
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  return Buffer.concat(chunks)
}

/**
 * Generate audio for a single section's content using ElevenLabs
 */
async function generateSectionAudio(
  content: string,
  language: string
): Promise<Buffer> {
  const voiceConfig = getVoiceForLanguage(language)

  const audioStream = await elevenlabs.textToSpeech.convert(voiceConfig.voiceId, {
    text: content,
    modelId: MODEL_ID,
  })

  // Convert stream to buffer
  return streamToBuffer(audioStream as unknown as ReadableStream<Uint8Array>)
}

/**
 * Upload audio buffer to Supabase Storage and return a signed URL
 */
async function uploadAudioToStorage(
  supabase: SupabaseClient,
  audioBuffer: Buffer,
  moduleId: string,
  sectionId: string
): Promise<string> {
  const filePath = `audio/${moduleId}/${sectionId}.mp3`

  const { error } = await supabase.storage
    .from('glossa-modules')
    .upload(filePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload audio: ${error.message}`)
  }

  // Get signed URL (valid for 1 year = 31536000 seconds)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('glossa-modules')
    .createSignedUrl(filePath, 31536000)

  if (signedError || !signedData?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${signedError?.message}`)
  }

  return signedData.signedUrl
}

/**
 * Generate and upload audio for a single section
 * Returns the public URL of the uploaded audio
 */
export async function generateAudioForSection(
  supabase: SupabaseClient,
  moduleId: string,
  sectionId: string,
  content: string,
  language: string
): Promise<AudioGenerationResult> {
  try {
    // Generate audio from content
    const audioBuffer = await generateSectionAudio(content, language)

    // Upload to storage
    const audioUrl = await uploadAudioToStorage(
      supabase,
      audioBuffer,
      moduleId,
      sectionId
    )

    return { success: true, audioUrl }
  } catch (error) {
    console.error(`Audio generation failed for section ${sectionId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process items with limited concurrency
 */
async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result)
    })

    executing.push(promise as unknown as Promise<void>)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      // Remove completed promises
      const completed = executing.filter(
        (p) => (p as Promise<void> & { settled?: boolean }).settled
      )
      for (const c of completed) {
        const idx = executing.indexOf(c)
        if (idx > -1) executing.splice(idx, 1)
      }
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Generate audio for multiple sections with limited concurrency
 * ElevenLabs free tier allows max 2 concurrent requests
 */
export async function generateAudioForSections(
  supabase: SupabaseClient,
  moduleId: string,
  sections: Array<{ id: string; content: string }>,
  language: string
): Promise<Map<string, AudioGenerationResult>> {
  const results = new Map<string, AudioGenerationResult>()

  // Process sequentially to avoid rate limits (can increase to 2 for paid plans)
  for (const section of sections) {
    const result = await generateAudioForSection(
      supabase,
      moduleId,
      section.id,
      section.content,
      language
    )
    results.set(section.id, result)
  }

  return results
}

/**
 * Update section records with audio URLs
 */
export async function updateSectionsWithAudioUrls(
  supabase: SupabaseClient,
  audioResults: Map<string, AudioGenerationResult>
): Promise<void> {
  const updates: Array<Promise<void>> = []

  for (const [sectionId, result] of audioResults) {
    if (result.success && result.audioUrl) {
      const updatePromise = (async () => {
        const { error } = await supabase
          .from('sections')
          .update({ audio_url: result.audioUrl })
          .eq('id', sectionId)

        if (error) {
          console.error(
            `Failed to update audio_url for section ${sectionId}:`,
            error
          )
        }
      })()
      updates.push(updatePromise)
    }
  }

  await Promise.all(updates)
}
