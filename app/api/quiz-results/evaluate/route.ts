import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { evaluateQuiz } from '@/lib/services/quizEvaluation'
import type { Quiz, Section, QuizQuestion } from '@/types/database'

interface QuizWithSection extends Quiz {
  section: Section
}

// POST /api/quiz-results/evaluate - Evaluate quiz answers using LLM
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { quiz_id, answers } = body

    // Validate input
    if (!quiz_id || !answers || !Array.isArray(answers)) {
      return apiError('Missing required fields: quiz_id, answers', 400)
    }

    // Validate answer structure
    for (const answer of answers) {
      if (!answer.question_id || typeof answer.user_response !== 'string') {
        return apiError(
          'Each answer must have question_id and user_response',
          400
        )
      }
    }

    // Fetch quiz with section
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*, section:sections!inner(*)')
      .eq('id', quiz_id)
      .single()

    if (quizError || !quiz) {
      return apiError('Quiz not found', 404)
    }

    const typedQuiz = quiz as unknown as QuizWithSection

    // Validate all questions have answers
    const questionIds = typedQuiz.questions.map((q: QuizQuestion) => q.id)
    const providedIds = answers.map(
      (a: { question_id: string }) => a.question_id
    )

    const missingQuestions = questionIds.filter(
      (id: string) => !providedIds.includes(id)
    )

    if (missingQuestions.length > 0) {
      return apiError(
        `Missing answers for questions: ${missingQuestions.join(', ')}`,
        400
      )
    }

    // Evaluate
    const result = await evaluateQuiz({
      quiz: typedQuiz,
      section: typedQuiz.section,
      answers,
    })

    if (!result.success) {
      return apiError(result.error, 500, result.details)
    }

    return apiSuccess(result.result)
  } catch {
    return apiError('Internal server error', 500)
  }
}
