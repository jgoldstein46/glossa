import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/response";

async function getQuizResultsByModuleId(
  moduleId: string,
  config: {
    limit: number;
    offset: number;
  },
) {
  const supabase = await createSupabaseServerClient();
  const userId = (await supabase.auth.getUser()).data.user!.id;
  // 1. Get all section IDs for the module
  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("id")
    .eq("module_id", moduleId);

  if (sectionsError) {
    return { data: null, error: sectionsError, count: 0 };
  }

  const sectionIds = sections.map((s) => s.id);
  const { offset, limit } = config;

  // 3. Get the most recently completed quiz results for those quizzes
  const query = supabase
    .from("quizzes")
    .select("*, quiz_results(*)")
    .eq("quiz_results.user_id", userId)
    .in("section_id", sectionIds)
    .order("completed_at", {
      ascending: false,
      referencedTable: "quiz_results",
    })
    .range(offset, offset + limit - 1);
  return query;
}
// GET /api/quiz-results - Get all quiz results
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const quizId = searchParams.get("quiz_id");
    const moduleId = searchParams.get("module_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    let data, error, count;

    if (moduleId) {
      ({ data, error, count } = await getQuizResultsByModuleId(moduleId, {
        offset,
        limit,
      }));
    } else {
      let query = supabase
        .from("quiz_results")
        .select("*, quiz:quizzes(id, title, section_id)", { count: "exact" })
        .order("completed_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (quizId) query = query.eq("quiz_id", quizId);

      ({ data, error, count } = await query);
    }

    if (error) {
      console.log("Got error while attempting to fetch quiz results:", error);
      return apiError("Failed to fetch quiz results", 500, error.message);
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

// POST /api/quiz-results - Submit quiz result
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const { quiz_id, score, answers } = body;

    if (!quiz_id || score === undefined || !answers) {
      return apiError("Missing required fields: quiz_id, score, answers", 400);
    }

    if (typeof score !== "number" || score < 0 || score > 100) {
      return apiError("Score must be a number between 0 and 100", 400);
    }

    if (!Array.isArray(answers)) {
      return apiError("Answers must be an array", 400);
    }

    const { data, error } = await supabase
      .from("quiz_results")
      .insert({
        quiz_id,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        score,
        answers,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return apiError("Failed to submit quiz result", 500, error.message);
    }

    return apiSuccess(data, 201);
  } catch {
    return apiError("Internal server error", 500);
  }
}
