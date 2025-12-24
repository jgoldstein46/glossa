import type { ResponseFormatJSONSchema } from "openai/resources/shared";

// Types for LLM-generated content (before database insertion)
export interface GeneratedQuizQuestion {
  question_text: string;
  input_type: "text" | "voice" | "multiple_choice";
  options?: string[];
  correct_answer?: string;
  order_index: number;
}

export interface GeneratedQuiz {
  title: string;
  questions: GeneratedQuizQuestion[];
}

export interface GeneratedSection {
  title: string;
  content: string;
  order_index: number;
  quiz: GeneratedQuiz;
}

export interface GeneratedModule {
  description: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  sections: GeneratedSection[];
}

// JSON Schema for OpenAI structured output
export const moduleGenerationSchema: ResponseFormatJSONSchema = {
  type: "json_schema",
  json_schema: {
    name: "module_generation",
    strict: true,
    schema: {
      type: "object",
      required: ["description", "topic", "difficulty", "sections"],
      additionalProperties: false,
      properties: {
        description: {
          type: "string",
          description:
            "A concise description under 50 words: what the learner will understand and why it matters. Be direct and specific.",
        },
        topic: {
          type: "string",
          description:
            'The main topic category (e.g., "Programming", "Mathematics", "Science")',
        },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
        },
        sections: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            required: ["title", "content", "order_index", "quiz"],
            additionalProperties: false,
            properties: {
              title: {
                type: "string",
                description: "A clear, concise section title",
              },
              content: {
                type: "string",
                description:
                  'Socratic educational content (~150-200 words, ~1 min read). Structure: Hook (provocative question/scenario) → Exploration (guide through concept with questions) → Core Insight (memorable aha moment) → Connection (real-world link). Use "you", analogies, rhetorical questions.',
              },
              order_index: {
                type: "integer",
                description: "Zero-based index for section ordering",
              },
              quiz: {
                type: "object",
                required: ["title", "questions"],
                additionalProperties: false,
                properties: {
                  title: {
                    type: "string",
                    description: 'Quiz title, typically "Section N Quiz"',
                  },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      required: [
                        "question_text",
                        "input_type",
                        "order_index",
                        "options",
                        "correct_answer",
                      ],
                      additionalProperties: false,
                      properties: {
                        question_text: {
                          type: "string",
                          description:
                            "The question to ask. Q1 (voice): open-ended reflection testing understanding. Q2 (MC): tests current section concept with plausible distractors. Q3 (MC): spaced repetition—callbacks to earlier sections or synthesis of multiple concepts.",
                        },
                        input_type: {
                          type: "string",
                          enum: ["text", "voice", "multiple_choice"],
                        },
                        options: {
                          type: ["array", "null"],
                          items: { type: "string" },
                          description:
                            "For multiple_choice: exactly 4 short options (max 10 words each). Distractors should be plausible misconceptions. For voice questions, use null.",
                        },
                        correct_answer: {
                          type: ["string", "null"],
                          description:
                            "The correct answer. For multiple_choice, must match one of the options exactly. For voice questions, use null.",
                        },
                        order_index: {
                          type: "integer",
                          description: "Zero-based index for question ordering",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const SYSTEM_PROMPT = `You are a Socratic tutor and expert educational content creator. Your goal is to create engaging, adaptive learning experiences that help students truly understand and retain knowledge—not just memorize facts.

## Core Philosophy: The Socratic Method
- Never simply tell students the answer. Guide them to discover it themselves through thoughtful questions.
- Each section should pose intriguing questions that spark curiosity before revealing concepts.
- Use the "reveal" technique: hint at something interesting, build anticipation, then deliver the insight.
- Connect new concepts to things students already know from everyday life.
- Acknowledge common misconceptions and address them directly.

## Content Structure (exactly 5 sections, ~1 minute each, ~150-200 words)

### Section Flow:
1. **Hook**: Start with a provocative question, surprising fact, or relatable scenario
2. **Exploration**: Guide the learner through the concept using questions and examples
3. **Core Insight**: Deliver the key understanding in a memorable way
4. **Connection**: Link to real-world applications or the next concept

### Writing Style:
- Use "you" and speak directly to the learner as a mentor would
- Ask rhetorical questions that make the reader pause and think
- Use analogies and metaphors from everyday life
- Break complex ideas into digestible chunks
- Include moments of "aha!" revelation
- Be warm, encouraging, and intellectually stimulating

## Quiz Design: Anki-Style Spaced Repetition

Each section has 3 questions that follow spaced repetition principles:

### Question 1: Voice/Reflection (input_type: "voice")
- Open-ended question requiring the student to explain in their own words
- Should test genuine understanding, not recall
- Examples: "Explain why...", "How would you teach this to a friend?", "What's the relationship between..."
- For sections 2+: Include a concept callback to earlier material

### Question 2: Multiple Choice - Current Section
- Tests the core concept from the current section
- Include plausible distractors based on common misconceptions
- The wrong answers should reveal thinking errors, not be obviously wrong

### Question 3: Multiple Choice - Spaced Repetition
- **Section 1**: Another question on current section (establishes baseline)
- **Section 2**: Callback to Section 1 concept (first repetition)
- **Section 3**: Callback to Section 1 OR 2 concept (reinforcement)
- **Section 4**: Callback to Section 2 OR 3 concept
- **Section 5**: Synthesis question combining concepts from multiple earlier sections

This creates an interleaved review pattern that strengthens long-term retention.

## Difficulty Calibration

Infer the appropriate difficulty from the title:
- **Beginner**: Assume no prior knowledge. Use simple analogies. Define all terms. More scaffolding.
- **Intermediate**: Assume foundational knowledge. Build on basics. Introduce nuance and edge cases.
- **Advanced**: Assume solid understanding. Focus on deep insights, trade-offs, and expert-level considerations.

## Description (Under 50 words)

Keep the module description concise and punchy. In under 50 words, state:
- What the learner will understand
- Why it matters practically

Example: "Learn the fundamentals of recursion through visual examples. You'll understand how functions call themselves, when to use recursion vs iteration, and how to avoid common pitfalls like stack overflow."

## Example Section Opening (for inspiration)

Instead of: "Variables in programming are containers that store data."

Write: "Imagine you're a chef preparing a complex dish. You don't dump all your ingredients into one pile—you use separate bowls to keep your chopped onions, measured spices, and prepped vegetables organized and ready. Programming works the same way. But here's the interesting question: how does a computer 'remember' where it put each ingredient? Let's find out..."

## Output Quality

- Keep all text clean and well-formed
- Multiple choice options should be SHORT (under 10 words each)
- Avoid special characters that could break JSON formatting
- Each section should have exactly 3 quiz questions

Remember: Your goal is not to transfer information, but to create understanding. Make learners think, question, and discover.`;

// ============================================
// Quiz Evaluation Types and Schema
// ============================================

export interface QuestionEvaluation {
  question_id: string;
  score: number;
  is_correct: boolean;
  feedback: string;
}

export interface QuizEvaluationResult {
  overall_score: number;
  question_evaluations: QuestionEvaluation[];
}

export const quizEvaluationSchema: ResponseFormatJSONSchema = {
  type: "json_schema",
  json_schema: {
    name: "quiz_evaluation",
    strict: true,
    schema: {
      type: "object",
      required: ["overall_score", "question_evaluations"],
      additionalProperties: false,
      properties: {
        overall_score: {
          type: "number",
          description: "Overall quiz score from 0-100",
        },
        question_evaluations: {
          type: "array",
          items: {
            type: "object",
            required: ["question_id", "score", "is_correct", "feedback"],
            additionalProperties: false,
            properties: {
              question_id: {
                type: "string",
                description: "The ID of the question being evaluated",
              },
              score: {
                type: "number",
                description: "Score for this question (0-100)",
              },
              is_correct: {
                type: "boolean",
                description:
                  "Whether the answer meets the threshold for correctness (score >= 70)",
              },
              feedback: {
                type: "string",
                description:
                  "Brief 2-3 sentence feedback summarizing performance and key learning points",
              },
            },
          },
        },
      },
    },
  },
};
