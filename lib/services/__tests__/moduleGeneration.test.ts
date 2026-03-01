import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GeneratedModule } from "@/lib/openai/schemas";

// --- Mocks ---

const mockSupabaseFrom = vi.fn();
const mockSupabase = { from: mockSupabaseFrom, storage: { from: vi.fn() } };

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/openai/client", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
  MODEL_ID: "test-model",
}));

vi.mock("@/lib/openai/schemas", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    moduleGenerationSchema: { type: "json_schema", json_schema: { name: "test" } },
    SYSTEM_PROMPT: "test prompt",
  };
});

vi.mock("@/lib/services/audioGeneration", () => ({
  generateAudioForSections: vi.fn(),
  updateSectionsWithAudioUrls: vi.fn(),
}));

// --- Helpers ---

function makeGeneratedModule(): GeneratedModule {
  return {
    description: "Test description",
    topic: "Test Topic",
    difficulty: "beginner",
    sections: [
      {
        title: "Section 1",
        content: "Content 1",
        key_points: ["point1"],
        order_index: 0,
        quiz: {
          title: "Quiz 1",
          questions: [
            {
              question_text: "Q1?",
              input_type: "multiple_choice",
              options: ["A", "B", "C", "D"],
              correct_answer: "A",
              order_index: 0,
            },
          ],
        },
      },
    ],
  };
}

/** Build a chainable mock for supabase query builder */
function chainable(finalResult: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () =>
    new Proxy(chain, {
      get(_target, prop) {
        if (prop === "then") {
          // Make it thenable so await resolves to finalResult
          return (resolve: (v: unknown) => void) => resolve(finalResult);
        }
        return handler;
      },
    });
  return handler();
}

function setupSupabaseMock(overrides: Record<string, { data?: unknown; error?: unknown }> = {}) {
  const defaults: Record<string, { data?: unknown; error?: unknown }> = {
    modules_insert: { data: { id: "mod-1" }, error: null },
    module_generation_status_insert: {
      data: { id: "status-1", module_id: "mod-1" },
      error: null,
    },
    user_module_progress_select: { data: null, error: null },
    user_module_progress_insert: { data: null, error: null },
    modules_update: {
      data: {
        id: "mod-1",
        title: "Test",
        description: "Test description",
        topic: "Test Topic",
        difficulty: "beginner",
        language: "English",
        is_published: true,
        creator_id: "user-1",
        is_public: false,
        estimated_duration_mins: 5,
        thumbnail_url: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      error: null,
    },
    sections_insert: {
      data: [
        {
          id: "sec-1",
          module_id: "mod-1",
          title: "Section 1",
          content: "Content 1",
          key_points: ["point1"],
          order_index: 0,
          audio_url: null,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ],
      error: null,
    },
    quizzes_insert: {
      data: [
        {
          id: "quiz-1",
          section_id: "sec-1",
          title: "Quiz 1",
          questions: [],
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ],
      error: null,
    },
    module_generation_status_update: { data: null, error: null },
    sections_select: { data: [], error: null },
    modules_delete: { data: null, error: null },
  };

  const config = { ...defaults, ...overrides };

  mockSupabaseFrom.mockImplementation((table: string) => {
    const makeChain = (result: { data?: unknown; error?: unknown }) => chainable(result);

    // Route based on table + operation by returning an object with operation methods
    return {
      insert: () => makeChain(config[`${table}_insert`] || { data: null, error: null }),
      update: () => makeChain(config[`${table}_update`] || { data: null, error: null }),
      delete: () => makeChain(config[`${table}_delete`] || { data: null, error: null }),
      select: () => makeChain(config[`${table}_select`] || { data: null, error: null }),
    };
  });
}

// --- Tests ---

describe("generateModule", () => {
  let openaiMock: { chat: { completions: { create: ReturnType<typeof vi.fn> } } };
  let audioMock: {
    generateAudioForSections: ReturnType<typeof vi.fn>;
    updateSectionsWithAudioUrls: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const openaiModule = await import("@/lib/openai/client");
    openaiMock = openaiModule.openai as typeof openaiMock;

    const audioModule = await import("@/lib/services/audioGeneration");
    audioMock = audioModule as unknown as typeof audioMock;
  });

  it("returns success with module, sections, and quizzes on happy path", async () => {
    const generated = makeGeneratedModule();
    openaiMock.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(generated) } }],
    });

    setupSupabaseMock();

    audioMock.generateAudioForSections.mockResolvedValue(new Map());
    audioMock.updateSectionsWithAudioUrls.mockResolvedValue(undefined);

    const { generateModule } = await import("@/lib/services/moduleGeneration");
    const result = await generateModule(
      { title: "Test", language: "English", moduleId: "mod-1", creatorId: "user-1" },
      mockSupabase as any,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.module).toBeDefined();
      expect(result.module.id).toBe("mod-1");
      expect(result.sections).toBeInstanceOf(Array);
      expect(result.quizzes).toBeInstanceOf(Array);
    }
  });

  it("returns error when OpenAI fails", async () => {
    openaiMock.chat.completions.create.mockRejectedValue(new Error("OpenAI rate limit"));

    setupSupabaseMock();

    const { generateModule } = await import("@/lib/services/moduleGeneration");
    const result = await generateModule(
      { title: "Test", language: "English", moduleId: "mod-1", creatorId: "user-1" },
      mockSupabase as any,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to generate module content");
      expect(result.details).toBe("OpenAI rate limit");
    }
  });

  it("returns error when initial DB insert fails", async () => {
    setupSupabaseMock({
      modules_insert: { data: null, error: { message: "DB error", details: "connection lost" } },
    });

    const { generateModule } = await import("@/lib/services/moduleGeneration");
    const result = await generateModule(
      { title: "Test", language: "English", moduleId: "mod-1", creatorId: "user-1" },
      mockSupabase as any,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("DB error");
    }

    // OpenAI should not have been called
    expect(openaiMock.chat.completions.create).not.toHaveBeenCalled();
  });

  it("still returns success when audio generation fails", async () => {
    const generated = makeGeneratedModule();
    openaiMock.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(generated) } }],
    });

    setupSupabaseMock();

    audioMock.generateAudioForSections.mockRejectedValue(new Error("ElevenLabs down"));

    const { generateModule } = await import("@/lib/services/moduleGeneration");
    const result = await generateModule(
      { title: "Test", language: "English", moduleId: "mod-1", creatorId: "user-1" },
      mockSupabase as any,
    );

    // Module should still be created successfully despite audio failure
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.module).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(result.quizzes).toBeDefined();
    }
  });

  it("follows correct call order: initial records -> content -> update -> sections/quizzes -> audio", async () => {
    const callOrder: string[] = [];

    const generated = makeGeneratedModule();
    openaiMock.chat.completions.create.mockImplementation(async () => {
      callOrder.push("openai");
      return { choices: [{ message: { content: JSON.stringify(generated) } }] };
    });

    // Track call order through supabase operations
    mockSupabaseFrom.mockImplementation((table: string) => {
      const makeTrackedChain = (op: string, result: { data?: unknown; error?: unknown }) => {
        callOrder.push(`${table}.${op}`);
        return chainable(result);
      };

      return {
        insert: () =>
          makeTrackedChain(
            "insert",
            table === "sections"
              ? {
                  data: [
                    {
                      id: "sec-1",
                      module_id: "mod-1",
                      title: "Section 1",
                      content: "Content 1",
                      key_points: ["point1"],
                      order_index: 0,
                      audio_url: null,
                      created_at: "2024-01-01",
                      updated_at: "2024-01-01",
                    },
                  ],
                  error: null,
                }
              : table === "quizzes"
                ? {
                    data: [
                      {
                        id: "quiz-1",
                        section_id: "sec-1",
                        title: "Quiz 1",
                        questions: [],
                        created_at: "2024-01-01",
                        updated_at: "2024-01-01",
                      },
                    ],
                    error: null,
                  }
                : table === "module_generation_status"
                  ? { data: { id: "status-1", module_id: "mod-1" }, error: null }
                  : { data: { id: "mod-1" }, error: null },
          ),
        update: () =>
          makeTrackedChain(
            "update",
            table === "modules"
              ? {
                  data: {
                    id: "mod-1",
                    title: "Test",
                    description: "Test description",
                    topic: "Test Topic",
                    difficulty: "beginner",
                    language: "English",
                    is_published: true,
                    creator_id: "user-1",
                    is_public: false,
                    estimated_duration_mins: 5,
                    thumbnail_url: null,
                    created_at: "2024-01-01",
                    updated_at: "2024-01-01",
                  },
                  error: null,
                }
              : { data: null, error: null },
          ),
        delete: () => makeTrackedChain("delete", { data: null, error: null }),
        select: () =>
          makeTrackedChain("select", {
            data: table === "user_module_progress" ? null : [],
            error: null,
          }),
      };
    });

    audioMock.generateAudioForSections.mockImplementation(async () => {
      callOrder.push("audio");
      return new Map();
    });
    audioMock.updateSectionsWithAudioUrls.mockResolvedValue(undefined);

    const { generateModule } = await import("@/lib/services/moduleGeneration");
    await generateModule(
      { title: "Test", language: "English", moduleId: "mod-1", creatorId: "user-1" },
      mockSupabase as any,
    );

    // Verify key ordering
    const modulesInsertIdx = callOrder.indexOf("modules.insert");
    const openaiIdx = callOrder.indexOf("openai");
    const modulesUpdateIdx = callOrder.indexOf("modules.update");
    const sectionsInsertIdx = callOrder.indexOf("sections.insert");
    const quizzesInsertIdx = callOrder.indexOf("quizzes.insert");
    const audioIdx = callOrder.indexOf("audio");

    expect(modulesInsertIdx).toBeLessThan(openaiIdx);
    expect(openaiIdx).toBeLessThan(modulesUpdateIdx);
    expect(modulesUpdateIdx).toBeLessThan(sectionsInsertIdx);
    expect(sectionsInsertIdx).toBeLessThan(quizzesInsertIdx);
    expect(quizzesInsertIdx).toBeLessThan(audioIdx);
  });
});
