import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/profiles/[id] - Get profile by ID (auth required, own only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { id } = await params

    // Users can only view their own profile
    if (id !== auth.user.id) {
      return apiError('Forbidden', 403, 'You can only access your own profile')
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return apiError('Profile not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

// PATCH /api/profiles/[id] - Update profile (auth required, own only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { id } = await params

    // Users can only update their own profile
    if (id !== auth.user.id) {
      return apiError('Forbidden', 403, 'You can only update your own profile')
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const allowedFields = ['display_name', 'avatar_url'] as const
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
      .from('profiles')
      .update(updateData as unknown as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return apiError('Failed to update profile', 500, error.message)
    }

    if (!data) {
      return apiError('Profile not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}
