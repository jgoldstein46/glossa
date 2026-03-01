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
  state: string,
  errorMessage?: string,
  errorDetails?: string,
) {
  const update: any = {
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
) {
  const { data: existingUserModuleProgress } = await supabase
    .from("user_module_progress")
    .select("id")
    .eq("module_id", moduleId)
    .eq("user_id", creatorId)
    .single();

  if (!existingUserModuleProgress) {
    const { error: userModuleProgressInsertionError } = await supabase
      .from("user_module_progress")
      .insert({
        module_id: moduleId,
        user_id: creatorId,
        status: "in_progress",
        current_section_index: 0,
      });

    if (userModuleProgressInsertionError) {
      console.log("Got error inserting user module progress: ", userModuleProgressInsertionError);
      return {
        success: false,
        error: userModuleProgressInsertionError.message,
        details: userModuleProgressInsertionError.details,
      };
    }
  }
}

async function insertInitialRecords(
  supabase: SupabaseClient,
  config: {
    title: string;
    language: string;
    moduleId: string;
    creatorId: string | null;
  },
) {
  const { title, language, moduleId, creatorId } = config;

  const moduleError = await insertModule(supabase, {
    moduleId,
    creatorId,
    title,
    language,
  });
  if (moduleError) return moduleError;

  const moduleGenerationStatusError = insertModuleGenerationStatus(supabase, moduleId);
  if (moduleGenerationStatusError) return moduleGenerationStatusError;

  const insertUserModuleProgressError = await insertUserModuleProgress(
    supabase,
    moduleId,
    creatorId,
  );
  if (insertUserModuleProgressError) return insertUserModuleProgressError;
}

async function updateModule(supabase: SupabaseClient, generated, moduleId: string) {
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
    console.log("Got error while trying to update module in DB:", moduleError);
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
}

async function insertSectionsAndQuizzes(supabase, generated) {
  const sections: Section[] = [];
  const quizzes: Quiz[] = [];

  console.log("Inserting sections for module with ID:", module.id);

  for (const sectionData of generated.sections) {
    // Create section
    const { data: section, error: sectionError } = await supabase
      .from("sections")
      .insert({
        module_id: module.id,
        title: sectionData.title,
        content: sectionData.content,
        key_points: sectionData.key_points,
        order_index: sectionData.order_index,
      })
      .select()
      .single();

    if (sectionError || !section) {
      // Cleanup: delete module on failure (cascade will handle sections)
      await supabase.from("modules").delete().eq("id", module.id);
      const errorMessage = "Failed to create section";
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

    sections.push(section);
    console.log("Inserting questions for section: ", section.id);
    // Create quiz for section
    const questionsWithIds: QuizQuestion[] = sectionData.quiz.questions.map((q) => ({
      id: crypto.randomUUID(),
      question_text: q.question_text,
      input_type: q.input_type,
      options: q.options,
      correct_answer: q.correct_answer,
      order_index: q.order_index,
    }));

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        section_id: section.id,
        title: sectionData.quiz.title,
        questions: questionsWithIds,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      // Cleanup: delete module on failure (cascade will handle sections/quizzes)
      await supabase.from("modules").delete().eq("id", module.id);
      const errorMessage = "Failed to create quiz";
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

    quizzes.push(quiz);
  }
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
    const initialRecordInsertionError = await insertInitialRecords(supabase, {
      title,
      language,
      moduleId,
      creatorId,
    });
    if (initialRecordInsertionError) return initialRecordInsertionError;

    // Step 1: Generate content via LLM
    let generated;
    try {
      generated = await generateModuleContent(title, language);
    } catch (error) {
      return await handleModuleGenerationError(error, supabase, moduleId);
    }

    const udpateModuleError = await updateModule(supabase, generated, moduleId);
    if (udpateModuleError) return udpateModuleError;

    // Step 3: Create sections and quizzes

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
        module.id,
        sectionsForAudio,
        language,
      );

      // Update sections with audio URLs
      await updateSectionsWithAudioUrls(supabase, audioResults);

      // Refresh sections to get updated audio_url values
      const { data: updatedSections } = await supabase
        .from("sections")
        .select("*")
        .eq("module_id", module.id)
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
): Promise<{ success: false; error: string; details: string } | undefined> {
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
}

async function insertModule(
  supabase: SupabaseClient,
  moduleConfig: {
    moduleId: string;
    creatorId: string | null;
    title: string;
    language: string;
  },
) {
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
