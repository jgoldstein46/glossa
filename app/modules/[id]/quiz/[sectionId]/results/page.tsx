"use client";

import {
  getModuleSections,
  getProgress,
  submitQuizResult,
  updateProgress,
  Quiz,
  QuizAnswer,
  QuizEvaluationResponse,
  Section,
  UserModuleProgress,
} from "@/lib/api/client";
import clsx from "clsx";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Loader2,
  PartyPopper,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface StoredQuizResult extends QuizEvaluationResponse {
  quiz: Quiz;
  moduleId: string;
  sectionId: string;
}

export default function QuizResultsPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();

  // Data states
  const [result, setResult] = useState<StoredQuizResult | null>(null);
  const [progress, setProgress] = useState<UserModuleProgress | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const currentSectionIndex = sections.findIndex(
    (s) => s.id === params.sectionId,
  );
  const isLastSection = currentSectionIndex === sections.length - 1;
  const nextSectionIndex = currentSectionIndex + 1;

  // Load result from sessionStorage and fetch progress
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      // Get stored result
      const storedResult = sessionStorage.getItem("quizResult");
      if (storedResult) {
        try {
          const parsed = JSON.parse(storedResult) as StoredQuizResult;
          setResult(parsed);

          // Submit quiz result to backend
          await submitQuizResult({
            body: {
              quiz_id: parsed.quiz.id,
              score: parsed.score,
              answers: parsed.answers,
            },
          });
        } catch (e) {
          console.error("Failed to parse quiz result:", e);
        }
      }

      // Fetch progress and sections
      const [progressResult, sectionsResult] = await Promise.all([
        getProgress({ path: { id: params.id } }),
        getModuleSections({ path: { id: params.id } }),
      ]);

      if (progressResult.data?.success) {
        setProgress(progressResult.data.data);
      }

      if (sectionsResult.data?.success) {
        const sorted = [...sectionsResult.data.data].sort(
          (a, b) => a.order_index - b.order_index,
        );
        setSections(sorted);
      }

      setIsLoading(false);

      // Clear stored result
      sessionStorage.removeItem("quizResult");
    }

    loadData();
  }, [params.id, params.sectionId]);

  // Auto-advance countdown
  useEffect(() => {
    if (isLoading || !result) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, result]);

  // Continue to next section
  const handleContinue = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    if (progress) {
      if (isLastSection) {
        // Complete module
        await updateProgress({
          path: { id: progress.id },
          body: {
            status: "completed",
            current_section_index: currentSectionIndex,
          },
        });
      } else {
        // Go to next section
        await updateProgress({
          path: { id: progress.id },
          body: { current_section_index: nextSectionIndex },
        });
      }
    }

    router.push(`/modules/${params.id}`);
  };

  // Back to module
  const handleBackToModule = () => {
    router.push(`/modules/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 mb-4">No quiz results found</p>
        <button
          onClick={handleBackToModule}
          className="text-blue-600 hover:underline"
        >
          Back to module
        </button>
      </div>
    );
  }

  // Determine score tier
  const scoreTier =
    result.score >= 80
      ? { icon: PartyPopper, label: "Excellent!", color: "text-green-600" }
      : result.score >= 60
        ? { icon: ThumbsUp, label: "Good job!", color: "text-blue-600" }
        : { icon: BookOpen, label: "Keep practicing!", color: "text-amber-600" };

  const ScoreIcon = scoreTier.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <h1 className="text-xl font-bold text-gray-900">Quiz Complete!</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Score Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <ScoreIcon className={clsx("w-12 h-12 mx-auto mb-3", scoreTier.color)} />
            <p className={clsx("text-lg font-semibold mb-4", scoreTier.color)}>
              {scoreTier.label}
            </p>

            {/* Score Circle */}
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={result.score >= 60 ? "#2563eb" : "#f59e0b"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(result.score / 100) * 352} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">
                  {result.score}%
                </span>
                <span className="text-sm text-gray-500">
                  {result.answers.filter((a) => a.is_correct).length}/
                  {result.answers.length}
                </span>
              </div>
            </div>

            {/* Feedback */}
            {result.feedback && (
              <p className="text-gray-600 text-sm">{result.feedback}</p>
            )}
          </div>

          {/* Question Breakdown */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">Question Breakdown</h2>

            {result.quiz.questions.map((question, index) => {
              const answer = result.answers.find(
                (a) => a.question_id === question.id,
              );
              const isCorrect = answer?.is_correct;

              return (
                <div
                  key={question.id}
                  className={clsx(
                    "bg-white rounded-xl border p-4",
                    isCorrect ? "border-green-200" : "border-red-200",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                        isCorrect
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600",
                      )}
                    >
                      {isCorrect ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        Q{index + 1}: {isCorrect ? "Correct" : "Incorrect"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {question.question_text}
                      </p>

                      {answer && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-500">
                            Your answer:{" "}
                            <span className="text-gray-700">
                              {answer.user_response}
                            </span>
                          </p>

                          {!isCorrect &&
                            question.input_type === "multiple_choice" &&
                            question.correct_answer && (
                              <p className="text-green-600 mt-1">
                                Correct: {question.correct_answer}
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <button
            onClick={handleContinue}
            disabled={isNavigating}
            className="w-full py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isNavigating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLastSection ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Complete Module</span>
              </>
            ) : (
              <>
                <span>Continue to Next Section</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            Auto-continuing in {countdown}s...
          </p>

          <button
            onClick={handleBackToModule}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Module
          </button>
        </div>
      </footer>
    </div>
  );
}
