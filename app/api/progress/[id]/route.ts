import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/progress/[id] - Get single progress record
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('user_module_progress')
      .select('*, module:modules(id, title, topic, difficulty, thumbnail_url)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return apiError('Progress record not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// PATCH /api/progress/[id] - Update progress
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    // Verify record exists
    const { data: existing } = await supabase
      .from('user_module_progress')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return apiError('Progress record not found', 404)
    }

    const allowedFields = ['status', 'current_section_index', 'completed_at'] as const
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        (updateData as Record<string, unknown>)[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No valid fields to update', 400)
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ['in_progress', 'completed']
      if (!validStatuses.includes(updateData.status as string)) {
        return apiError('Invalid status. Must be: in_progress or completed', 400)
      }

      // Auto-set completed_at when marking as completed
      if ((updateData.status as string) === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('user_module_progress')
      .update(updateData as unknown as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return apiError('Failed to update progress', 500, error.message)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}
