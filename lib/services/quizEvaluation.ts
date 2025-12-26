import { openai, MODEL_ID } from "@/lib/openai/client";
import {
  quizEvaluationSchema,
  QuizEvaluationResult,
} from "@/lib/openai/schemas";
import {
  EVALUATION_SYSTEM_PROMPT,
  buildEvaluationPrompt,
  QuestionForEvaluation,
} from "@/lib/openai/evaluation";
import type { Quiz, Section, QuizAnswer } from "@/types/database";

export interface EvaluationInput {
  quiz: Quiz;
  section: Section;
  answers: Array<{
    question_id: string;
    user_response: string;
  }>;
}

interface EvaluationSuccess {
  success: true;
  result: {
    score: number;
    answers: QuizAnswer[];
  };
}

interface EvaluationError {
  success: false;
  error: string;
  details?: string;
}

export type EvaluationOutput = EvaluationSuccess | EvaluationError;

export async function evaluateQuiz(
  input: EvaluationInput,
): Promise<EvaluationOutput> {
  try {
    const { quiz, section, answers } = input;

    // Map answers to questions
    const questionsWithResponses: QuestionForEvaluation[] =
      filterQuestionsWithResponses(quiz, answers);

    const openEndedQuestionsWithResponses = questionsWithResponses.filter(
      (q) => q.input_type === "voice" || q.input_type === "text",
    );
    const multipleChoiceQuestions = questionsWithResponses.filter(
      (q) => q.input_type === "multiple_choice",
    );
    const multipleChoiceQuestionsEvaluation = evaluateMultipleChoiceOnly(
      multipleChoiceQuestions,
    );

    // Build prompt and call OpenAI
    const prompt = buildEvaluationPrompt(
      section.content,
      section.title,
      openEndedQuestionsWithResponses,
    );

    const response = await openai.chat.completions.create({
      model: MODEL_ID,
      messages: [
        { role: "system", content: EVALUATION_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: quizEvaluationSchema,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { success: false, error: "No content in OpenAI response" };
    }

    const openEndedQuestionsEvaluation: QuizEvaluationResult =
      JSON.parse(content);

    // Transform to QuizAnswer format
    const openEndedEvaluatedAnswers: QuizAnswer[] =
      openEndedQuestionsEvaluation.question_evaluations.map((qe) => ({
        question_id: qe.question_id,
        user_response:
          questionsWithResponses.find((q) => q.id === qe.question_id)
            ?.user_response ?? "",
        is_correct: qe.is_correct,
        feedback: qe.feedback,
      }));

    const finalScore = Math.round(
      openEndedQuestionsEvaluation.overall_score *
        (openEndedQuestionsWithResponses.length / quiz.questions.length) +
        multipleChoiceQuestionsEvaluation.result.score *
          (multipleChoiceQuestions.length / quiz.questions.length),
    );

    return {
      success: true,
      result: {
        score: finalScore,
        answers: [
          ...multipleChoiceQuestionsEvaluation.result.answers,
          ...openEndedEvaluatedAnswers,
        ],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Evaluation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function filterQuestionsWithResponses(
  quiz: Quiz,
  answers: { question_id: string; user_response: string }[],
): QuestionForEvaluation[] {
  return quiz.questions.map((q) => {
    const answer = answers.find((a) => a.question_id === q.id);
    return {
      id: q.id,
      question_text: q.question_text,
      input_type: q.input_type,
      correct_answer: q.correct_answer,
      user_response: answer?.user_response ?? "",
    };
  });
}

function evaluateMultipleChoiceOnly(
  questions: QuestionForEvaluation[],
): EvaluationSuccess {
  const results: QuizAnswer[] = questions.map((q) => ({
    question_id: q.id,
    user_response: q.user_response,
    is_correct: q.user_response === q.correct_answer,
    correct_answer: q.correct_answer,
    feedback: null,
  }));

  const correctCount = results.filter((r) => r.is_correct).length;
  const score = Math.round((correctCount / results.length) * 100);

  return {
    success: true,
    result: {
      score,
      answers: results,
    },
  };
}
