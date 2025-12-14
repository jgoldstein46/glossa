import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'

// GET /api/profiles - Get own profile (auth required)
export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .single()

    if (error || !data) {
      return apiError('Profile not found', 404)
    }

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}
