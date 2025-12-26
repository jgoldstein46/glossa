"use client";

import ModuleHeader from "@/components/module/module-header";
import useModule from "@/hooks/module/use-module";
import { fetchElevenLabsScribeToken } from "@/lib/actions/fetch-elevenlabs-scribe-token";
import {
  getModule,
  getModuleSections,
  getProgress,
  getSectionQuiz,
  startModule,
  updateProgress,
  Module,
  Section,
  UserModuleProgress,
  Quiz,
} from "@/lib/api/client";
import clsx from "clsx";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileQuestion,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ModuleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [scribeToken, setScribeToken] = useState<string | null>(null);
  const { module, sections, progress, setProgress, isLoading } = useModule();
  const currentSectionIndex = progress?.current_section_index || 0;

  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Audio states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);

  const currentSection = sections[currentSectionIndex];

  // Load scribe token for voice recording
  useEffect(() => {
    async function loadScribeToken() {
      const { token } = await fetchElevenLabsScribeToken();
      setScribeToken(token || null);
    }
    loadScribeToken();
  }, []);

  // Load quiz for current section
  useEffect(() => {
    async function loadQuiz() {
      if (!currentSection) return;

      const quizResult = await getSectionQuiz({
        path: { id: currentSection.id },
      });

      if (quizResult.data?.success) {
        setCurrentQuiz(quizResult.data.data);
      }
    }

    loadQuiz();
  }, [currentSection]);

  // Setup audio player
  useEffect(() => {
    if (!currentSection?.audio_url) {
      setAudioLoaded(false);
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(currentSection.audio_url);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration);
      setAudioLoaded(true);
    });

    audio.addEventListener("timeupdate", () => {
      setAudioProgress(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });

    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));

    // Auto-play when section loads
    audio.play().catch(() => {
      // Browser may block autoplay
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [currentSection?.audio_url]);

  // Start module if not started
  const handleStartModule = useCallback(async () => {
    if (progress) return;

    const result = await startModule({
      body: { module_id: params.id },
    });

    if (result.data?.success) {
      setProgress(result.data.data);
    }
  }, [params.id, progress, setProgress]);

  useEffect(() => {
    handleStartModule();
  }, [handleStartModule]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Navigate to section
  const goToSection = useCallback(
    async (index: number) => {
      if (index < 0 || index >= sections.length) return;
      if (index === currentSectionIndex) return;

      pauseAudio();

      setIsContentExpanded(false);

      // Update progress if we have it
      if (currentSectionIndex !== undefined) {
        const result = await updateProgress({
          path: { module_id: params.id },
          body: { current_section_index: index },
        });

        if (result.data?.success) {
          setProgress(result.data.data);
        }
      }
    },
    [sections.length, params.id, currentSectionIndex, setProgress, pauseAudio],
  );

  const goToRecap = useCallback(() => {
    pauseAudio();
    setIsContentExpanded(false);
    router.push(`/modules/${params.id}/recap`);
  }, [pauseAudio, router, setIsContentExpanded, params.id]);

  const handleContinue = useCallback(() => {
    if (currentSectionIndex < sections.length - 1) {
      goToSection(currentSectionIndex + 1);
    } else {
      goToRecap();
    }
  }, [currentSectionIndex, goToSection, goToRecap, sections]);

  // Audio controls
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioDuration;
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start quiz
  const handleStartQuiz = () => {
    if (!currentSection || !currentQuiz) return;
    router.push(`/modules/${params.id}/quiz/${currentSection.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!module || sections.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 mb-4">Module not found</p>
        <Link href="/home" className="text-blue-600 hover:underline">
          Back to modules
        </Link>
      </div>
    );
  }

  const difficultyColors = {
    beginner: "bg-green-100 text-green-700",
    intermediate: "bg-yellow-100 text-yellow-700",
    advanced: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <ModuleHeader
        moduleTitle={module.title}
        totalSectionsCount={sections.length}
        currentSectionIndex={currentSectionIndex}
      />

      {/* Section Progress Dots */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => goToSection(index)}
              className={clsx(
                "w-3 h-3 rounded-full transition-all",
                index === currentSectionIndex
                  ? "bg-blue-600 scale-125"
                  : index < currentSectionIndex
                    ? "bg-blue-400"
                    : "bg-gray-300 hover:bg-gray-400",
              )}
              aria-label={`Go to section ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Module Info (collapsed by default) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {module.topic}
              </span>
              <span
                className={clsx(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                  difficultyColors[module.difficulty],
                )}
              >
                {module.difficulty}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                <Clock className="w-3 h-3" />
                {module.estimated_duration_mins} min
              </span>
            </div>
            <p className="text-sm text-gray-600">{module.description}</p>
          </div>

          {/* Section Content */}
          {currentSection && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">
                {currentSection.title}
              </h2>

              <div
                className={clsx(
                  "text-gray-700 leading-relaxed",
                  !isContentExpanded && "line-clamp-6",
                )}
              >
                {currentSection.content}
              </div>

              {currentSection.content.length > 300 && (
                <button
                  onClick={() => setIsContentExpanded(!isContentExpanded)}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  {isContentExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Audio Player */}
          {currentSection?.audio_url && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Listen to this section
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAudio}
                  disabled={!audioLoaded}
                  className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                <div className="flex-1">
                  <div
                    className="h-2 bg-gray-200 rounded-full cursor-pointer"
                    onClick={seekAudio}
                  >
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatTime(audioProgress)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>

                <button
                  onClick={restartAudio}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Quiz CTA */}
          {currentQuiz && (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-5 text-white">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FileQuestion className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Take the Quiz</h3>
                  <p className="text-white/80 text-sm mt-1">
                    {currentQuiz.questions.length} questions to test your
                    understanding
                  </p>
                </div>
              </div>
              <button
                onClick={handleStartQuiz}
                className="mt-4 w-full bg-white text-blue-600 font-semibold py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start Quiz
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Section Navigation */}
      <footer className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => goToSection(currentSectionIndex - 1)}
            disabled={currentSectionIndex === 0}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
              currentSectionIndex === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100",
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <span className="text-sm text-gray-500">
            {currentSectionIndex + 1} / {sections.length}
          </span>

          <button
            onClick={handleContinue}
            className={
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100"
            }
          >
            <span className="hidden sm:inline">
              {currentSectionIndex === sections.length - 1
                ? "Go to Recap"
                : "Next"}
            </span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
