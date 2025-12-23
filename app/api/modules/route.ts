import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api/response'
import { generateModule } from '@/lib/services/moduleGeneration'

// GET /api/modules - List published modules (public)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const topic = searchParams.get("topic");
    const difficulty = searchParams.get("difficulty");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("modules")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (topic) query = query.eq("topic", topic);
    if (difficulty) query = query.eq("difficulty", difficulty);

    const { data, error, count } = await query;

    if (error) {
      return apiError("Failed to fetch modules", 500, error.message);
    }

    return apiPaginated(data ?? [], {
      total: count,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    });
  } catch {
    return apiError("Internal server error", 500);
  }
}

// POST /api/modules - Generate module from title
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { title, language } = body
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return apiError('Missing required field: title', 400)
    }

    const moduleLanguage = typeof language === 'string' && language.trim().length > 0
      ? language.trim()
      : 'English'

    const result = await generateModule(supabase, title.trim(), moduleLanguage)

    if (!result.success) {
      return apiError(result.error, 500, result.details)
    }

    return apiSuccess({
      module: result.module,
      sections: result.sections,
      quizzes: result.quizzes,
    }, 201)
  } catch {
    return apiError("Internal server error", 500);
  }
}
