import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/sections/[id]/quiz - Get the quiz for a section (public, published modules only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    // Verify the section exists and belongs to a published module
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('id, module:modules!inner(id, is_published)')
      .eq('id', id)
      .eq('module.is_published', true)
      .single()

    if (sectionError || !section) {
      return apiError('Section not found', 404)
    }

    // Get the quiz for the section
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('section_id', id)
      .single()

    if (error || !data) {
      return apiError('Quiz not found for this section', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}
