import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

// GET /api/profiles - Get all profiles
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')

    if (error) {
      return apiError('Failed to fetch profiles', 500, error.message)
    }

    return apiSuccess(data ?? [])
  } catch {
    return apiError('Internal server error', 500)
  }
}
