"use client";

import { Module, ProgressStatus } from "@/lib/api/client";
import clsx from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Play,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ModuleCardProps {
  module: Module;
  moduleProgressStatus: ProgressStatus | null;
  currentSectionIndex?: number;
}

export default function ModuleCard({
  module,
  moduleProgressStatus,
  currentSectionIndex = 0,
}: ModuleCardProps) {
  const router = useRouter();
  const totalSections = 5; // Each module has 5 sections
  const progressPercent =
    moduleProgressStatus === "completed"
      ? 100
      : moduleProgressStatus === "in_progress"
        ? Math.round(((currentSectionIndex + 1) / totalSections) * 100)
        : 0;

  const difficultyColors = {
    beginner: "bg-green-100 text-green-700",
    intermediate: "bg-yellow-100 text-yellow-700",
    advanced: "bg-red-100 text-red-700",
  };

  const buttonConfig = {
    not_started: {
      text: "Start",
      icon: Play,
      className: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    in_progress: {
      text: "Continue",
      icon: ArrowRight,
      className: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    completed: {
      text: "Review",
      icon: RotateCcw,
      className: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    },
  };

  const status = moduleProgressStatus || "not_started";
  const button = buttonConfig[status as keyof typeof buttonConfig];
  const ButtonIcon = button.icon;

  return (
    <div
      onClick={() => router.push(`/modules/${module.id}`)}
      className={clsx(
        "w-full rounded-xl flex flex-col overflow-hidden border border-gray-200 cursor-pointer transition-all hover:shadow-lg hover:border-gray-300",
        {
          "bg-gray-50/50": moduleProgressStatus === "completed",
          "bg-white": moduleProgressStatus !== "completed",
        },
      )}
    >
      {/* Thumbnail */}
      {module.thumbnail_url ? (
        <div className="h-32 bg-gray-100 overflow-hidden">
          <img
            src={module.thumbnail_url}
            alt={module.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <GraduationCap className="w-12 h-12 text-white/80" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-gray-900 leading-tight line-clamp-2">
            {module.title}
          </h2>
          {moduleProgressStatus === "completed" && (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {module.topic}
          </span>
          <span
            className={clsx(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
              difficultyColors[module.difficulty as keyof typeof difficultyColors],
            )}
          >
            {module.difficulty}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{module.estimated_duration_mins} min</span>
        </div>

        {/* Progress bar (only show if in progress) */}
        {moduleProgressStatus === "in_progress" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/modules/${module.id}`);
          }}
          className={clsx(
            "mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors",
            button.className,
          )}
        >
          <span>{button.text}</span>
          <ButtonIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
