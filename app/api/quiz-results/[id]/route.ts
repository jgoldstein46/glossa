import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/quiz-results/[id] - Get single quiz result (auth required, own only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('quiz_results')
      .select('*, quiz:quizzes(id, title, section_id, questions)')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single()

    if (error || !data) {
      return apiError('Quiz result not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}
