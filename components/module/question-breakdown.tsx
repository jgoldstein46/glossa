import { QuizAnswer, QuizQuestion } from "@/types/database";
import clsx from "clsx";
import { Check, X } from "lucide-react";

interface QuestionBreakdownProps {
  questions: QuizQuestion[];
  answers: QuizAnswer[];
}

export default function QuestionBreakdown({
  questions,
  answers,
}: QuestionBreakdownProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900">Question Breakdown</h2>

      {questions.map((question, index) => {
        const answer = answers.find((a) => a.question_id === question.id);
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

                    {answer.feedback && (
                      <p className="text-gray-500">
                        Feedback:{" "}
                        <span className="text-gray-700">{answer.feedback}</span>
                      </p>
                    )}

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
  );
}
