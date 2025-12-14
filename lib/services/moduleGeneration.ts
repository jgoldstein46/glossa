import { SupabaseClient } from '@supabase/supabase-js'
import { openai, MODEL_ID } from '@/lib/openai/client'
import {
  moduleGenerationSchema,
  SYSTEM_PROMPT,
  GeneratedModule,
} from '@/lib/openai/schemas'
import type { Module, Section, Quiz, QuizQuestion } from '@/lib/api/client/types.gen'

interface GenerationSuccess {
  success: true
  module: Module
  sections: Section[]
  quizzes: Quiz[]
}

interface GenerationError {
  success: false
  error: string
  details?: string
}

export type ModuleGenerationResult = GenerationSuccess | GenerationError

async function generateModuleContent(title: string, language: string): Promise<GeneratedModule> {
  const response = await openai.chat.completions.create({
    model: MODEL_ID,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Create a learning module titled: "${title}"\n\nIMPORTANT: Generate ALL content (description, section titles, section content, quiz questions, and quiz options) in ${language}.`,
      },
    ],
    response_format: moduleGenerationSchema,
  })

  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('No content in OpenAI response')
  }

  return JSON.parse(content) as GeneratedModule
}

export async function generateModule(
  supabase: SupabaseClient,
  title: string,
  language: string = 'English'
): Promise<ModuleGenerationResult> {
  try {
    // Step 1: Generate content via LLM
    const generated = await generateModuleContent(title, language)

    // Step 2: Create module in database
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .insert({
        title,
        description: generated.description,
        topic: generated.topic,
        difficulty: generated.difficulty,
        language,
        estimated_duration_mins: 5,
        is_published: false,
      })
      .select()
      .single()

    if (moduleError || !module) {
      return {
        success: false,
        error: 'Failed to create module',
        details: moduleError?.message,
      }
    }

    // Step 3: Create sections and quizzes
    const sections: Section[] = []
    const quizzes: Quiz[] = []

    for (const sectionData of generated.sections) {
      // Create section
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .insert({
          module_id: module.id,
          title: sectionData.title,
          content: sectionData.content,
          order_index: sectionData.order_index,
        })
        .select()
        .single()

      if (sectionError || !section) {
        // Cleanup: delete module on failure (cascade will handle sections)
        await supabase.from('modules').delete().eq('id', module.id)
        return {
          success: false,
          error: 'Failed to create section',
          details: sectionError?.message,
        }
      }

      sections.push(section)

      // Create quiz for section
      const questionsWithIds: QuizQuestion[] = sectionData.quiz.questions.map(
        (q) => ({
          id: crypto.randomUUID(),
          question_text: q.question_text,
          input_type: q.input_type,
          options: q.options,
          correct_answer: q.correct_answer,
          order_index: q.order_index,
        })
      )

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          section_id: section.id,
          title: sectionData.quiz.title,
          questions: questionsWithIds,
        })
        .select()
        .single()

      if (quizError || !quiz) {
        // Cleanup: delete module on failure (cascade will handle sections/quizzes)
        await supabase.from('modules').delete().eq('id', module.id)
        return {
          success: false,
          error: 'Failed to create quiz',
          details: quizError?.message,
        }
      }

      quizzes.push(quiz)
    }

    return {
      success: true,
      module,
      sections,
      quizzes,
    }
  } catch (error) {
    return {
      success: false,
      error: 'Module generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
