import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api/response'

// GET /api/progress - Get all module progress
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const moduleId = searchParams.get('module_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('user_module_progress')
      .select('*, module:modules(id, title, topic, difficulty, thumbnail_url)', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (moduleId) query = query.eq('module_id', moduleId)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query

    if (error) {
      return apiError('Failed to fetch progress', 500, error.message)
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

// POST /api/progress - Start a module
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { module_id } = body

    if (!module_id) {
      return apiError('Missing required field: module_id', 400)
    }

    // Check if progress already exists for this module
    const { data: existing } = await supabase
      .from('user_module_progress')
      .select('id')
      .eq('module_id', module_id)
      .single()

    if (existing) {
      return apiError('Progress already exists for this module', 409)
    }

    const { data, error } = await supabase
      .from('user_module_progress')
      .insert({
        module_id,
        status: 'in_progress',
        current_section_index: 0,
      })
      .select()
      .single()

    if (error) {
      return apiError('Failed to start module', 500, error.message)
    }

    return apiSuccess(data, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}
