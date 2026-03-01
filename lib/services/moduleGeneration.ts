"use server";
import { SupabaseClient } from "@supabase/supabase-js";
import { openai, MODEL_ID } from "@/lib/openai/client";
import { moduleGenerationSchema, SYSTEM_PROMPT, GeneratedModule } from "@/lib/openai/schemas";
import type { Module, Section, Quiz, QuizQuestion } from "@/lib/api/client/types.gen";
import {
  generateAudioForSections,
  updateSectionsWithAudioUrls,
} from "@/lib/services/audioGeneration";
import { createSupabaseServerClient } from "../supabase/server";
import type { GenerationState } from "@/types/database";

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };

interface GenerationSuccess {
  success: true;
  module: Module;
  sections: Section[];
  quizzes: Quiz[];
}

interface GenerationError {
  success: false;
  error: string;
  details?: string;
}

export type ModuleGenerationResult = GenerationSuccess | GenerationError;

async function generateModuleContent(title: string, language: string): Promise<GeneratedModule> {
  console.log(`Generating module: ${title} in ${language}.`);
  const response = await openai.chat.completions.create({
    model: MODEL_ID,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Create a learning module titled: "${title}"\n\nIMPORTANT: Generate ALL content (description, section titles, section content, quiz questions, and quiz options) in ${language}.`,
      },
    ],
    response_format: moduleGenerationSchema,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const mod = JSON.parse(content) as GeneratedModule;
  console.log("Generated module:", JSON.stringify(mod, null, 2));
  return mod;
}

async function updateGenerationStatus(
  supabase: SupabaseClient,
  moduleId: string,
  state: GenerationState,
  errorMessage?: string,
  errorDetails?: string,
) {
  const update: {
    state: GenerationState;
    error_message: string | null;
    error_details: string | null;
    completed_at?: string;
  } = {
    state,
    error_message: errorMessage || null,
    error_details: errorDetails || null,
  };

  if (state === "completed") {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("module_generation_status")
    .update(update)
    .eq("module_id", moduleId);

  if (error) {
    console.log("Got error attempting to update module generation status: ", error);
  }
}

async function insertUserModuleProgress(
  supabase: SupabaseClient,
  moduleId: string,
  creatorId: string | null,
): Promise<ServiceResult<void>> {
  const { data: existingUserModuleProgress } = await supabase
    .from("user_module_progress")
    .select("id")
    .eq("module_id", moduleId)
    .eq("user_id", creatorId)
    .single();

  if (!existingUserModuleProgress) {
    const { error } = await supabase.from("user_module_progress").insert({
      module_id: moduleId,
      user_id: creatorId,
      status: "in_progress",
      current_section_index: 0,
    });

    if (error) {
      console.log("Got error inserting user module progress: ", error);
      return {
        success: false,
        error: error.message,
        details: error.details,
      };
    }
  }

  return { success: true, data: undefined };
}

async function insertInitialRecords(
  supabase: SupabaseClient,
  config: {
    title: string;
    language: string;
    moduleId: string;
    creatorId: string | null;
  },
): Promise<ServiceResult<void>> {
  const { title, language, moduleId, creatorId } = config;

  const moduleResult = await insertModule(supabase, {
    moduleId,
    creatorId,
    title,
    language,
  });
  if (!moduleResult.success) return moduleResult;

  const statusResult = await insertModuleGenerationStatus(supabase, moduleId);
  if (!statusResult.success) return statusResult;

  const progressResult = await insertUserModuleProgress(supabase, moduleId, creatorId);
  if (!progressResult.success) return progressResult;

  return { success: true, data: undefined };
}

async function updateModule(
  supabase: SupabaseClient,
  generated: GeneratedModule,
  moduleId: string,
): Promise<ServiceResult<{ module: Module }>> {
  const { data, error } = await supabase
    .from("modules")
    .update({
      description: generated.description,
      topic: generated.topic,
      difficulty: generated.difficulty,
      is_published: true,
    })
    .eq("id", moduleId)
    .select()
    .single();

  if (error || !data) {
    console.log("Got error while trying to update module in DB:", error);
    const errorMessage = "Failed to update module in database";
    await updateGenerationStatus(
      supabase,
      moduleId,
      "content_generation_error",
      errorMessage,
      error?.message,
    );
    return {
      success: false,
      error: errorMessage,
      details: error?.message,
    };
  }

  return { success: true, data: { module: data } };
}

async function insertSectionsAndQuizzes(
  supabase: SupabaseClient,
  generated: GeneratedModule,
  moduleId: string,
): Promise<ServiceResult<{ sections: Section[]; quizzes: Quiz[] }>> {
  console.log("Inserting sections for module with ID:", moduleId);

  // Pre-generate UUIDs and build all section rows
  const sectionRows = generated.sections.map((sectionData) => ({
    id: crypto.randomUUID(),
    module_id: moduleId,
    title: sectionData.title,
    content: sectionData.content,
    key_points: sectionData.key_points,
    order_index: sectionData.order_index,
  }));

  // Batch insert all sections
  const { data: sections, error: sectionError } = await supabase
    .from("sections")
    .insert(sectionRows)
    .select();

  if (sectionError || !sections) {
    await supabase.from("modules").delete().eq("id", moduleId);
    const errorMessage = "Failed to create sections";
    await updateGenerationStatus(
      supabase,
      moduleId,
      "content_generation_error",
      errorMessage,
      sectionError?.message,
    );
    return {
      success: false,
      error: errorMessage,
      details: sectionError?.message,
    };
  }

  // Build all quiz rows, mapping each to its section via the pre-generated IDs
  const quizRows = generated.sections.map((sectionData, index) => {
    const sectionId = sectionRows[index].id;
    const questionsWithIds: QuizQuestion[] = sectionData.quiz.questions.map((q) => ({
      id: crypto.randomUUID(),
      question_text: q.question_text,
      input_type: q.input_type,
      options: q.options,
      correct_answer: q.correct_answer,
      order_index: q.order_index,
    }));

    return {
      section_id: sectionId,
      title: sectionData.quiz.title,
      questions: questionsWithIds,
    };
  });

  // Batch insert all quizzes
  const { data: quizzes, error: quizError } = await supabase
    .from("quizzes")
    .insert(quizRows)
    .select();

  if (quizError || !quizzes) {
    await supabase.from("modules").delete().eq("id", moduleId);
    const errorMessage = "Failed to create quizzes";
    await updateGenerationStatus(
      supabase,
      moduleId,
      "content_generation_error",
      errorMessage,
      quizError?.message,
    );
    return {
      success: false,
      error: errorMessage,
      details: quizError?.message,
    };
  }

  return { success: true, data: { sections, quizzes } };
}

export async function generateModule(
  config: {
    title: string;
    language?: string;
    moduleId?: string;
    creatorId?: string;
  },
  supabase?: SupabaseClient,
): Promise<ModuleGenerationResult> {
  const { title, language, moduleId, creatorId } = {
    ...config,
    language: config.language || "English",
    moduleId: config.moduleId || crypto.randomUUID(),
    creatorId: config.creatorId || null,
  };
  if (!supabase) {
    supabase = await createSupabaseServerClient();
  }

  console.log("Generating module with moduleId and creatorId", moduleId, creatorId);

  try {
    const initialResult = await insertInitialRecords(supabase, {
      title,
      language,
      moduleId,
      creatorId,
    });
    if (!initialResult.success) return initialResult;

    // Step 1: Generate content via LLM
    let generated: GeneratedModule;
    try {
      generated = await generateModuleContent(title, language);
    } catch (error) {
      return await handleModuleGenerationError(error, supabase, moduleId);
    }

    // Step 2: Update module with generated metadata
    const updateResult = await updateModule(supabase, generated, moduleId);
    if (!updateResult.success) return updateResult;
    const { module } = updateResult.data;

    // Step 3: Create sections and quizzes
    const sectionsResult = await insertSectionsAndQuizzes(supabase, generated, moduleId);
    if (!sectionsResult.success) return sectionsResult;
    const { sections, quizzes } = sectionsResult.data;

    // Step 4: Update status to generating_audio
    await updateGenerationStatus(supabase, moduleId, "generating_audio");

    // Step 5: Generate audio for all sections (best-effort - module still created if audio fails)
    try {
      const sectionsForAudio = sections.map((s) => ({
        id: s.id,
        content: s.content,
      }));

      console.log("Generating audio for sections");
      const audioResults = await generateAudioForSections(
        supabase,
        moduleId,
        sectionsForAudio,
        language,
      );

      // Update sections with audio URLs
      await updateSectionsWithAudioUrls(supabase, audioResults);

      // Refresh sections to get updated audio_url values
      const { data: updatedSections } = await supabase
        .from("sections")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index");

      if (updatedSections) {
        sections.length = 0;
        sections.push(...updatedSections);
      }

      // Mark as completed
      await updateGenerationStatus(supabase, moduleId, "completed");
    } catch (audioError) {
      // Log audio generation failure and update status
      console.error("Audio generation failed:", audioError);
      const errorMessage = "Failed to generate audio";
      const errorDetails = audioError instanceof Error ? audioError.message : "Unknown error";
      await updateGenerationStatus(
        supabase,
        moduleId,
        "audio_generation_error",
        errorMessage,
        errorDetails,
      );
    }

    return {
      success: true,
      module,
      sections,
      quizzes,
    };
  } catch (error) {
    console.log("Error while generating module: ", error);
    return {
      success: false,
      error: "Module generation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function handleModuleGenerationError(
  error: unknown,
  supabase: SupabaseClient,
  moduleId: string,
): Promise<{ success: false; error: string; details: string }> {
  const errorMessage = "Failed to generate module content";
  const errorDetails = error instanceof Error ? error.message : "Unknown error";
  await updateGenerationStatus(
    supabase,
    moduleId,
    "content_generation_error",
    errorMessage,
    errorDetails,
  );
  return {
    success: false,
    error: errorMessage,
    details: errorDetails,
  };
}

async function insertModuleGenerationStatus(
  supabase: SupabaseClient,
  moduleId: string,
): Promise<ServiceResult<void>> {
  const { data, error } = await supabase
    .from("module_generation_status")
    .insert({
      module_id: moduleId,
      state: "generating_content",
      error_message: null,
      error_details: null,
      completed_at: null,
    })
    .select()
    .single();

  console.log("Got moduleGenerationStatus: ", data);

  if (error) {
    console.log(`Got moduleGenerationStatus error: ${error}`);
    return {
      success: false,
      error: error.message,
      details: error.details,
    };
  }

  return { success: true, data: undefined };
}

async function insertModule(
  supabase: SupabaseClient,
  moduleConfig: {
    moduleId: string;
    creatorId: string | null;
    title: string;
    language: string;
  },
): Promise<ServiceResult<void>> {
  const { moduleId, creatorId, title, language } = moduleConfig;

  const { error } = await supabase
    .from("modules")
    .insert({
      id: moduleId,
      creator_id: creatorId,
      title,
      description: "",
      topic: "",
      difficulty: "intermediate",
      language,
      estimated_duration_mins: 5,
      is_published: false,
    })
    .select()
    .single();
  console.log("In moduleGeneration, got moduleError:", error);
  if (error)
    return {
      success: false,
      error: error.message,
      details: error.details,
    };

  return { success: true, data: undefined };
}

export async function regenerateModuleAudio(
  supabase: SupabaseClient,
  moduleId: string,
): Promise<ModuleGenerationResult> {
  try {
    // Update status to generating_audio
    await updateGenerationStatus(supabase, moduleId, "generating_audio");

    // Get module and sections
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      return {
        success: false,
        error: "Module not found",
        details: moduleError?.message,
      };
    }

    const { data: sections, error: sectionsError } = await supabase
      .from("sections")
      .select("*")
      .eq("module_id", moduleId)
      .order("order_index");

    if (sectionsError || !sections) {
      return {
        success: false,
        error: "Failed to fetch sections",
        details: sectionsError?.message,
      };
    }

    // Generate audio for all sections
    try {
      const sectionsForAudio = sections.map((s) => ({
        id: s.id,
        content: s.content,
      }));

      console.log("Regenerating audio for sections");
      const audioResults = await generateAudioForSections(
        supabase,
        module.id,
        sectionsForAudio,
        module.language,
      );

      // Update sections with audio URLs
      await updateSectionsWithAudioUrls(supabase, audioResults);

      // Refresh sections to get updated audio_url values
      const { data: updatedSections } = await supabase
        .from("sections")
        .select("*")
        .eq("module_id", module.id)
        .order("order_index");

      // Mark as completed
      await updateGenerationStatus(supabase, moduleId, "completed");

      // Get quizzes for response
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("*")
        .in(
          "section_id",
          sections.map((s) => s.id),
        );

      return {
        success: true,
        module,
        sections: updatedSections || sections,
        quizzes: quizzes || [],
      };
    } catch (audioError) {
      console.error("Audio regeneration failed:", audioError);
      const errorMessage = "Failed to regenerate audio";
      const errorDetails = audioError instanceof Error ? audioError.message : "Unknown error";
      await updateGenerationStatus(
        supabase,
        moduleId,
        "audio_generation_error",
        errorMessage,
        errorDetails,
      );
      return {
        success: false,
        error: errorMessage,
        details: errorDetails,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Audio regeneration failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
