"use client";

import { fetchElevenLabsScribeToken } from "@/lib/actions/fetch-elevenlabs-scribe-token";
import {
  evaluateQuiz,
  getSectionQuiz,
  Quiz,
  QuizEvaluationAnswerInput,
  submitQuizResult,
} from "@/lib/api/client";
import { CommitStrategy } from "@elevenlabs/elevenlabs-js";
import { useScribe } from "@elevenlabs/react";
import clsx from "clsx";
import { ArrowRight, Check, Loader2, Mic, Square, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// Voice input component using ElevenLabs Scribe
function VoiceInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [showTextFallback, setShowTextFallback] = useState(false);

  const [pendingCommittedText, setPendingCommittedText] = useState<
    string | null
  >(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onCommittedTranscript: (data: { text: string }) => {
      setPendingCommittedText(data.text);
    },
  });

  useEffect(() => {
    if (!pendingCommittedText) return;

    const newValue = value
      ? `${value} ${pendingCommittedText}`
      : pendingCommittedText;
    onChange(newValue);
    setPendingCommittedText(null);
  }, [pendingCommittedText, onChange, value]);

  const handleToggleRecording = async () => {
    if (scribe.isConnected) {
      setPendingCommittedText(scribe.partialTranscript);
      scribe.disconnect();
    } else {
      const tokenResult = await fetchElevenLabsScribeToken();
      if (tokenResult) {
        await scribe.connect({
          token: tokenResult.token,
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }
    }
  };

  if (showTextFallback) {
    return (
      <div className="space-y-3">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full h-32 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
        />

        <button
          onClick={() => setShowTextFallback(false)}
          className="text-sm text-blue-600 hover:underline"
        >
          Try voice input instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording button */}
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-xl">
        <button
          onClick={handleToggleRecording}
          className={clsx(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all",
            scribe.isConnected
              ? "bg-red-500 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700",
            "text-white",
          )}
        >
          {scribe.isConnected ? (
            <Square className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>

        <p className="text-sm text-gray-600">
          {scribe.isConnected
            ? "Recording... tap to stop"
            : "Tap to start speaking"}
        </p>

        {/* Live transcript */}
        {scribe.partialTranscript && (
          <p className="text-gray-500 italic text-sm">
            {scribe.partialTranscript}
          </p>
        )}
      </div>

      {/* Transcript display */}
      {value && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Your answer:</p>
          <p className="text-gray-900">{value}</p>
        </div>
      )}

      {/* Fallback option */}
      <button
        onClick={() => setShowTextFallback(true)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Can&apos;t use microphone? Type instead
      </button>
    </div>
  );
}

// Multiple choice input component
function MultipleChoiceInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onChange(option)}
          className={clsx(
            "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
            value === option
              ? "border-blue-600 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
          )}
        >
          <div
            className={clsx(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              value === option
                ? "border-blue-600 bg-blue-600"
                : "border-gray-300",
            )}
          >
            {value === option && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-gray-900">{option}</span>
        </button>
      ))}
    </div>
  );
}

// Text input component
function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer here..."
      className="w-full h-32 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}

export default function QuizPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();

  // Data states
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const currentQuestionId = currentQuestion?.id || 0;
  const totalQuestions = quiz?.questions.length || 0;
  const currentAnswer = currentQuestionId
    ? answers[currentQuestionId] || ""
    : "";
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const canProceed = currentAnswer.trim().length > 0;

  // Load quiz data
  useEffect(() => {
    async function loadQuiz() {
      setIsLoading(true);

      const [quizResult] = await Promise.all([
        getSectionQuiz({ path: { id: params.sectionId } }),
      ]);

      if (quizResult.data?.success) {
        const quizData = quizResult.data.data;
        // Sort questions by order_index
        quizData.questions.sort((a, b) => a.order_index - b.order_index);
        setQuiz(quizData);
      }

      setIsLoading(false);
    }

    loadQuiz();
  }, [params.sectionId]);

  // Update answer

  const updateAnswer = useCallback(
    (value: string) => {
      if (!currentQuestionId) return;
      setAnswers((prev) => ({
        ...prev,
        [currentQuestionId]: value,
      }));
    },
    [currentQuestionId],
  );

  // Go to next question or submit
  const handleNext = async () => {
    if (!canProceed || !quiz) return;

    if (isLastQuestion) {
      // Submit quiz
      setIsSubmitting(true);

      const answerInputs: QuizEvaluationAnswerInput[] = quiz.questions.map(
        (q) => ({
          question_id: q.id,
          user_response: answers[q.id] || "",
        }),
      );

      const result = await evaluateQuiz({
        body: {
          quiz_id: quiz.id,
          answers: answerInputs,
        },
      });

      if (result.data?.success) {
        await submitQuizResult({
          body: {
            quiz_id: quiz.id,
            score: result.data.data.score,
            answers: result.data.data.answers,
          },
        });

        router.push(`/modules/${params.id}/quiz/${params.sectionId}/results`);
      } else {
        console.error("Quiz evaluation failed:", result);
        setIsSubmitting(false);
      }
    } else {
      // Go to next question
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  // Exit quiz
  const handleExit = () => {
    router.push(`/modules/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!quiz || !currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 mb-4">Quiz not found</p>
        <button onClick={handleExit} className="text-blue-600 hover:underline">
          Back to module
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleExit}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-600"
          >
            <X className="w-5 h-5" />
            <span className="text-sm font-medium">Exit</span>
          </button>

          <span className="text-sm font-medium text-gray-900">Quiz</span>

          <span className="text-sm font-medium text-gray-500">
            {currentQuestionIndex + 1}/{totalQuestions}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Question */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-600">
              Question {currentQuestionIndex + 1}
            </p>
            <h2 className="text-xl font-bold text-gray-900">
              {currentQuestion.question_text}
            </h2>
          </div>

          {/* Answer input based on type */}
          <div className="pt-4">
            {currentQuestion.input_type === "multiple_choice" &&
            currentQuestion.options ? (
              <MultipleChoiceInput
                options={currentQuestion.options}
                value={currentAnswer}
                onChange={updateAnswer}
              />
            ) : currentQuestion.input_type === "voice" ? (
              <VoiceInput value={currentAnswer} onChange={updateAnswer} />
            ) : (
              <TextInput value={currentAnswer} onChange={updateAnswer} />
            )}
          </div>
        </div>
      </main>

      {/* Footer with Next button */}
      <footer className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className={clsx(
              "w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
              canProceed && !isSubmitting
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : isLastQuestion ? (
              <>
                <span>Submit Quiz</span>
                <Check className="w-5 h-5" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
