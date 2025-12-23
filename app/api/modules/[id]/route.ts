import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/modules/[id] - Get single published module (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (error || !data) {
      return apiError('Module not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// PATCH /api/modules/[id] - Update module
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const allowedFields = [
      'title',
      'description',
      'topic',
      'difficulty',
      'estimated_duration_mins',
      'thumbnail_url',
      'is_published',
    ] as const

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        (updateData as Record<string, unknown>)[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No valid fields to update', 400)
    }

    if (updateData.difficulty) {
      const validDifficulties = ['beginner', 'intermediate', 'advanced']
      if (!validDifficulties.includes(updateData.difficulty as string)) {
        return apiError('Invalid difficulty. Must be: beginner, intermediate, or advanced', 400)
      }
    }

    const { data, error } = await supabase
      .from('modules')
      .update(updateData as unknown as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return apiError('Failed to update module', 500, error.message)
    }

    if (!data) {
      return apiError('Module not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// DELETE /api/modules/[id] - Delete module
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.from('modules').delete().eq('id', id)

    if (error) {
      return apiError('Failed to delete module', 500, error.message)
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return apiError('Internal server error', 500)
  }
}
