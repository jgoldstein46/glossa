import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

export const MODEL_ID = 'eleven_multilingual_v2'
