"use client";

import ModuleHeader from "@/components/module/module-header";
import useModule from "@/hooks/module/use-module";
import QuestionBreakdown from "@/components/module/question-breakdown";
import { listQuizResults } from "@/lib/api/client";
import { QuizWithQuizResults } from "@/types/database";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const moduleId: string | undefined = params.id as string;
  const [quizzesWithResults, setQuizzesWithResults] = useState<
    QuizWithQuizResults[] | null
  >(null);
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(
    new Set(),
  );
  const { sections, module } = useModule();

  useEffect(() => {
    async function loadQuizzesWithResultsForModule() {
      if (!moduleId) return;
      const quizzesWithResultsResponse = await listQuizResults({
        query: {
          module_id: moduleId,
        },
      });
      // TODO: Add error handling.
      if (quizzesWithResultsResponse.data?.success) {
        setQuizzesWithResults(quizzesWithResultsResponse.data.data);
      }
    }
    loadQuizzesWithResultsForModule();
  }, [moduleId]);

  const toggleQuiz = (quizId: string) => {
    setExpandedQuizzes((prev) => {
      const next = new Set(prev);
      if (next.has(quizId)) {
        next.delete(quizId);
      } else {
        next.add(quizId);
      }
      return next;
    });
  };

  if (!sections || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <ModuleHeader moduleTitle={module.title} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {/* What We Learned Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              What We Learned
            </h2>

            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {(section.key_points || []).map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700 flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {/* Quiz Recap Section */}
          {quizzesWithResults && quizzesWithResults.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Quiz Recap</h2>

              {sections.map((section) => {
                // Find the quiz for this section
                const quizWithResults = quizzesWithResults.find(
                  (q) => q.section_id === section.id,
                );

                if (!quizWithResults || !quizWithResults.quiz_results[0])
                  return null;

                const result = quizWithResults.quiz_results[0];
                const correctCount = result.answers.filter(
                  (a) => a.is_correct,
                ).length;
                const totalCount = result.answers.length;
                const isExpanded = expandedQuizzes.has(quizWithResults.id);

                return (
                  <div
                    key={section.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    {/* Quiz Summary Header */}
                    <button
                      onClick={() => toggleQuiz(quizWithResults.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {section.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Score: {correctCount}/{totalCount} correct (
                          {result.score}%)
                        </p>
                      </div>
                      <div className="ml-4 text-gray-400">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </button>

                    {/* Expandable Question Breakdown */}
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-gray-200">
                        <div className="pt-4">
                          <QuestionBreakdown
                            questions={quizWithResults.questions}
                            answers={result.answers}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/modules/${moduleId}`)}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Module
          </button>
        </div>
      </footer>
    </div>
  );
}
