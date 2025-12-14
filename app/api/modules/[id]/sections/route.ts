import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/modules/[id]/sections - Get all sections for a module (public, published only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    // First verify the module exists and is published
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id')
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (moduleError || !module) {
      return apiError('Module not found', 404)
    }

    // Get all sections for the module
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('module_id', id)
      .order('order_index', { ascending: true })

    if (error) {
      return apiError('Failed to fetch sections', 500, error.message)
    }

    return apiSuccess(data ?? [])
  } catch {
    return apiError('Internal server error', 500)
  }
}
