import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api/response'

// GET /api/sections - List sections (public, for published modules only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const moduleId = searchParams.get('module_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('sections')
      .select('*, module:modules!inner(id, is_published)', { count: 'exact' })
      .eq('module.is_published', true)
      .order('order_index', { ascending: true })
      .range(offset, offset + limit - 1)

    if (moduleId) query = query.eq('module_id', moduleId)

    const { data, error, count } = await query

    if (error) {
      return apiError('Failed to fetch sections', 500, error.message)
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

// POST /api/sections - Create section
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { module_id, title, content, order_index } = body
    if (!module_id || !title || !content || order_index === undefined) {
      return apiError('Missing required fields: module_id, title, content, order_index', 400)
    }

    const { data, error } = await supabase
      .from('sections')
      .insert({
        module_id,
        title,
        content,
        order_index,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return apiError('Section with this order_index already exists for this module', 409)
      }
      return apiError('Failed to create section', 500, error.message)
    }

    return apiSuccess(data, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}
