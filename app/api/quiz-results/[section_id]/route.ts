import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiSuccess, apiError } from "@/lib/api/response";

type RouteParams = { params: Promise<{ section_id: string }> };

// GET /api/quiz-results/[section_id] - Get a single quiz with results for a section
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { section_id } = await params;
    const supabase = await createSupabaseServerClient();
    const userId = (await supabase.auth.getUser()).data.user!.id;

    const { data, error } = await supabase
      .from("quizzes")
      .select("*, quiz_results(*)")
      .eq("quiz_results.user_id", userId)
      .eq("section_id", section_id)
      .order("completed_at", {
        ascending: false,
        referencedTable: "quiz_results",
      })
      .single();

    if (error || !data) {
      return apiError("Quiz result not found", 404);
    }

    return apiSuccess(data);
  } catch {
    return apiError("Internal server error", 500);
  }
}
