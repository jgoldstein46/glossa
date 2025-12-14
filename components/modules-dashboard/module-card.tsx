"use client";

import { Module, ProgressStatus } from "@/types/database";
import clsx from "clsx";
import { CircleCheck, CircleDotDashed } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ModuleCard({
  module,
  moduleProgressStatus,
}: {
  module: Module;
  moduleProgressStatus: ProgressStatus | null;
}) {
  function renderModuleProgress() {
    if (moduleProgressStatus === "in_progress") {
      return <CircleDotDashed className="h-4 w-4" />;
    } else if (moduleProgressStatus === "completed") {
      return <CircleCheck className="h-4 w-4" />;
    } else {
      return <div className="h-4 w-4"></div>;
    }
  }

  const router = useRouter();

  return (
    <div
      onClick={() => {
        router.push(`/modules/${module.title}`);
      }}
      className={clsx(
        "w-full rounded-lg flex flex-col gap-4 p-4 border border-gray-200",
        {
          "bg-gray-50": moduleProgressStatus === "completed",
        },
      )}
    >
      <div className="flex items-center">
        <h2 className="font-bold grow">{module.title}</h2>
        {renderModuleProgress()}
      </div>
      {moduleProgressStatus !== "completed" && (
        <h5 className="text-sm">{module.description}</h5>
      )}
    </div>
  );
}
