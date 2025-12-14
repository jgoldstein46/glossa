import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/sections/[id] - Get single section (public, for published modules)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('sections')
      .select('*, module:modules!inner(id, is_published)')
      .eq('id', id)
      .eq('module.is_published', true)
      .single()

    if (error || !data) {
      return apiError('Section not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// PATCH /api/sections/[id] - Update section (auth required)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const allowedFields = ['title', 'content', 'order_index'] as const
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        (updateData as Record<string, unknown>)[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No valid fields to update', 400)
    }

    const { data, error } = await supabase
      .from('sections')
      .update(updateData as unknown as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return apiError('Section with this order_index already exists for this module', 409)
      }
      return apiError('Failed to update section', 500, error.message)
    }

    if (!data) {
      return apiError('Section not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// DELETE /api/sections/[id] - Delete section (auth required)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.from('sections').delete().eq('id', id)

    if (error) {
      return apiError('Failed to delete section', 500, error.message)
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return apiError('Internal server error', 500)
  }
}
