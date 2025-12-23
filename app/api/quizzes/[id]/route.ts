import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/quizzes/[id] - Get single quiz (public, for published modules)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('quizzes')
      .select('*, section:sections!inner(id, module:modules!inner(id, is_published))')
      .eq('id', id)
      .eq('section.module.is_published', true)
      .single()

    if (error || !data) {
      return apiError('Quiz not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// PATCH /api/quizzes/[id] - Update quiz
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const allowedFields = ['title', 'questions'] as const
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
      .from('quizzes')
      .update(updateData as unknown as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return apiError('Failed to update quiz', 500, error.message)
    }

    if (!data) {
      return apiError('Quiz not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// DELETE /api/quizzes/[id] - Delete quiz
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.from('quizzes').delete().eq('id', id)

    if (error) {
      return apiError('Failed to delete quiz', 500, error.message)
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return apiError('Internal server error', 500)
  }
}
