import OpenAI from 'openai'
import { writeFileSync } from 'fs'
import { moduleGenerationSchema, SYSTEM_PROMPT } from '../lib/openai/schemas'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MODEL_ID = 'gpt-5-nano-2025-08-07'

interface GenerationResult {
  title: string
  generatedInSeconds: number
  tokens: {
    total: number
    prompt: number
    completion: number
  }
  module: unknown
  error?: string
}

async function testGeneration(title: string): Promise<GenerationResult> {
  console.log(`Generating: "${title}"...`)

  const startTime = Date.now()

  const response = await openai.chat.completions.create({
    model: MODEL_ID,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Create a learning module titled: "${title}"` },
    ],
    response_format: moduleGenerationSchema,
  })

  const elapsed = (Date.now() - startTime) / 1000
  const content = response.choices[0].message.content

  if (!content) {
    throw new Error('No content returned')
  }

  const module = JSON.parse(content)

  console.log(`  Done in ${elapsed.toFixed(2)}s (${response.usage?.total_tokens} tokens)`)

  return {
    title,
    generatedInSeconds: elapsed,
    tokens: {
      total: response.usage?.total_tokens ?? 0,
      prompt: response.usage?.prompt_tokens ?? 0,
      completion: response.usage?.completion_tokens ?? 0,
    },
    module,
  }
}

async function main() {
  const topics = ['Persian Greetings', 'Day of the Dead Mexico']
  const results: GenerationResult[] = []

  for (const topic of topics) {
    try {
      const result = await testGeneration(topic)
      results.push(result)
    } catch (error) {
      console.error(`Error generating "${topic}":`, error)
      results.push({
        title: topic,
        generatedInSeconds: 0,
        tokens: { total: 0, prompt: 0, completion: 0 },
        module: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const outputPath = 'scripts/test-output.json'
  writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\nResults written to ${outputPath}`)
}

main()
