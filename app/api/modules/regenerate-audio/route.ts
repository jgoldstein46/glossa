import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import { regenerateModuleAudio } from "@/lib/services/moduleGeneration";
import { requireAuth } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const { moduleId } = await request.json();

    if (!moduleId) {
      return NextResponse.json({ success: false, error: "Module ID is required" }, { status: 400 });
    }

    const result = await regenerateModuleAudio(supabase, moduleId);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error regenerating audio:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to regenerate audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
