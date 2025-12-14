import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api/response'

// GET /api/modules - List published modules (public)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const topic = searchParams.get('topic')
    const difficulty = searchParams.get('difficulty')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('modules')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (topic) query = query.eq('topic', topic)
    if (difficulty) query = query.eq('difficulty', difficulty)

    const { data, error, count } = await query

    if (error) {
      return apiError('Failed to fetch modules', 500, error.message)
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

// POST /api/modules - Create module (auth required)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { title, description, topic, difficulty } = body
    if (!title || !description || !topic || !difficulty) {
      return apiError('Missing required fields: title, description, topic, difficulty', 400)
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced']
    if (!validDifficulties.includes(difficulty)) {
      return apiError('Invalid difficulty. Must be: beginner, intermediate, or advanced', 400)
    }

    const { data, error } = await supabase
      .from('modules')
      .insert({
        title,
        description,
        topic,
        difficulty,
        estimated_duration_mins: body.estimated_duration_mins ?? 5,
        thumbnail_url: body.thumbnail_url ?? null,
        is_published: body.is_published ?? false,
      })
      .select()
      .single()

    if (error) {
      return apiError('Failed to create module', 500, error.message)
    }

    return apiSuccess(data, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}
