import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api/response'

// GET /api/quizzes - List quizzes (public, for published modules)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const sectionId = searchParams.get('section_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('quizzes')
      .select(
        '*, section:sections!inner(id, module:modules!inner(id, is_published))',
        { count: 'exact' }
      )
      .eq('section.module.is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (sectionId) query = query.eq('section_id', sectionId)

    const { data, error, count } = await query

    if (error) {
      return apiError('Failed to fetch quizzes', 500, error.message)
    }

    return apiPaginated(data ?? [], {
      total: count,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch {
    return apiError('Internal server error', 500)
  }
}

// POST /api/quizzes - Create quiz (auth required)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { section_id, title, questions } = body
    if (!section_id || !title) {
      return apiError('Missing required fields: section_id, title', 400)
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        section_id,
        title,
        questions: questions ?? [],
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return apiError('A quiz already exists for this section', 409)
      }
      return apiError('Failed to create quiz', 500, error.message)
    }

    return apiSuccess(data, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}
