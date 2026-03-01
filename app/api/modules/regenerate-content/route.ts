import { NextRequest, NextResponse } from "next/server";
import { generateModule } from "@/lib/services/moduleGeneration";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { moduleId, title, language } = await request.json();

    if (!moduleId || !title) {
      return NextResponse.json(
        { success: false, error: "Module ID and title are required" },
        { status: 400 },
      );
    }

    // Delete existing module content (cascade will handle sections/quizzes)
    await supabase.from("modules").delete().eq("id", moduleId);

    // Delete existing generation status
    await supabase.from("module_generation_status").delete().eq("module_id", moduleId);

    // Generate fresh module with same ID
    const result = await generateModule({
      title,
      language,
      moduleId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error regenerating content:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to regenerate content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
