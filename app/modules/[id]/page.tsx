"use client";

import ModuleHeader from "@/components/module/module-header";
import useModule from "@/hooks/module/use-module";
import { getSectionQuiz, startModule, updateProgress, Quiz } from "@/lib/api/client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ModuleGenerationStatus } from "@/types/database";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileQuestion,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ModuleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const { module, sections, progress, setProgress, isLoading } = useModule();
  const currentSectionIndex = progress?.current_section_index || 0;

  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<ModuleGenerationStatus | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Audio states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);

  const currentSection = sections[currentSectionIndex];

  // Load generation status and subscribe to realtime updates
  useEffect(() => {
    if (!params.id) return;

    const supabase = createSupabaseBrowserClient();
    supabase.realtime.setAuth();

    // Load initial status
    async function loadGenerationStatus() {
      const { data } = await supabase
        .from("module_generation_status")
        .select("*")
        .eq("module_id", params.id)
        .single();

      if (data) {
        console.log("Got generation status data in load generation status:", data);
        setGenerationStatus(data);
      }
    }

    loadGenerationStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`module_generation_status:${params.id}`, {
        config: { private: true },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "module_generation_status",
          filter: `module_id=eq.${params.id}`,
        },
        (payload) => {
          console.log("Got payload while listening to module generation status", payload);
          setGenerationStatus(payload.new as ModuleGenerationStatus);
        },
      )
      .subscribe();

    console.log("Subscribed to channel: ", channel);

    return () => {
      console.log("Cleaning up the channel", channel);
      supabase.removeChannel(channel);
    };
  }, [params.id]);

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

  // Retry handlers
  const handleRegenerateAudio = async () => {
    if (!module) return;
    setIsRegenerating(true);

    try {
      const response = await fetch("/api/modules/regenerate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: module.id }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("Failed to regenerate audio:", result.error);
      } else {
        // Refresh the page to get new audio URLs
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to regenerate audio:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateContent = async () => {
    if (!module) return;
    setIsRegenerating(true);

    try {
      const response = await fetch("/api/modules/regenerate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: module.id,
          title: module.title,
          language: module.language,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("Failed to regenerate content:", result.error);
      } else {
        // Refresh the page to get new content
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to regenerate content:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!module) {
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

  // Calculate progress percentage for generation
  const getGenerationProgress = () => {
    if (!generationStatus) return 100;

    const now = new Date().getTime();
    const started = new Date(generationStatus.started_at).getTime();
    const elapsed = now - started;

    // If completed, return 100
    if (generationStatus.state === "completed") return 100;

    // If error, stay at current progress
    if (
      generationStatus.state === "content_generation_error" ||
      generationStatus.state === "audio_generation_error"
    ) {
      return generationStatus.state === "content_generation_error" ? 20 : 70;
    }

    // Calculate progress based on state and time elapsed
    if (generationStatus.state === "generating_content") {
      // Content generation: 0-50% over first minute
      return Math.min(50, (elapsed / (60 * 1000)) * 50);
    } else if (generationStatus.state === "generating_audio") {
      // Audio generation: 50-100% over second minute
      return Math.min(100, 50 + (elapsed / (60 * 1000)) * 50);
    }

    return 0;
  };

  const getGenerationMessage = () => {
    if (!generationStatus) return null;

    switch (generationStatus.state) {
      case "generating_content":
        return "Generating module content...";
      case "generating_audio":
        return "Generating audio narration...";
      case "completed":
        return "Module ready!";
      case "content_generation_error":
        return "Failed to generate content";
      case "audio_generation_error":
        return "Failed to generate audio";
      default:
        return null;
    }
  };

  const isGenerating =
    generationStatus?.state === "generating_content" ||
    generationStatus?.state === "generating_audio";

  const hasError =
    generationStatus?.state === "content_generation_error" ||
    generationStatus?.state === "audio_generation_error";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <ModuleHeader
        moduleTitle={module.title}
        totalSectionsCount={sections.length}
        currentSectionIndex={currentSectionIndex}
      />

      {/* Generation Progress Banner */}
      {generationStatus && (isGenerating || hasError) && (
        <div
          className={clsx(
            "border-b px-4 py-3",
            hasError ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200",
          )}
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              {isGenerating && (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              )}
              {hasError && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              {generationStatus.state === "completed" && (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={clsx(
                    "font-medium text-sm",
                    hasError ? "text-red-900" : "text-blue-900",
                  )}
                >
                  {getGenerationMessage()}
                </p>
                {hasError && generationStatus.error_message && (
                  <p className="text-xs text-red-700 mt-1">{generationStatus.error_message}</p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 ease-linear"
                  style={{ width: `${getGenerationProgress()}%` }}
                />
              </div>
            )}

            {/* Error Actions */}
            {hasError && (
              <div className="flex gap-2 mt-3">
                {generationStatus.state === "content_generation_error" && (
                  <button
                    onClick={handleRegenerateContent}
                    disabled={isRegenerating}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRegenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Regenerate Content
                  </button>
                )}
                {generationStatus.state === "audio_generation_error" && (
                  <button
                    onClick={handleRegenerateAudio}
                    disabled={isRegenerating}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRegenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Regenerate Audio
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
          {module.is_published && (
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
          )}

          {/* Section Content */}
          {currentSection && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">{currentSection.title}</h2>

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
                <span className="text-sm font-medium text-gray-700">Listen to this section</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAudio}
                  disabled={!audioLoaded}
                  className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full cursor-pointer" onClick={seekAudio}>
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

          {/* Audio Generating Notice */}
          {!currentSection?.audio_url && generationStatus?.state === "generating_audio" && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Audio is being generated</p>
                  <p className="text-xs text-blue-700 mt-1">
                    You can read the content now. Audio narration will be available shortly.
                  </p>
                </div>
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
                    {currentQuiz.questions.length} questions to test your understanding
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
              {currentSectionIndex === sections.length - 1 ? "Go to Recap" : "Next"}
            </span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
