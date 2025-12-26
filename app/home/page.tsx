"use client";

import ModuleCard from "@/components/modules-dashboard/module-card";
import {
  getProgress,
  listModules,
  ProgressStatus,
  Module,
  UserModuleProgress,
} from "@/lib/api/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ModuleWithProgress {
  module: Module;
  status: ProgressStatus | null;
  currentSectionIndex: number;
}

export default function Page() {
  const [modules, setModules] = useState<ModuleWithProgress[] | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      setIsLoading(true);
      const results = await listModules();
      if (results.data?.success) {
        const resultsWithProgress = await Promise.all(
          results.data.data.map(async (mod) => {
            const userModuleProgressResult = await getProgress({
              path: {
                module_id: mod.id,
              },
            });
            const progress = userModuleProgressResult.data?.success
              ? (userModuleProgressResult.data.data as UserModuleProgress)
              : null;
            return {
              module: mod,
              status: progress?.status || null,
              currentSectionIndex: progress?.current_section_index || 0,
            };
          }),
        );
        setModules(resultsWithProgress);
      } else {
        console.error(
          "Got error while fetching modules: ",
          JSON.stringify(results),
        );
      }
      setIsLoading(false);
    };
    fetchModules();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Your Modules</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : modules && modules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {modules.map((moduleWithProgress) => (
              <ModuleCard
                key={moduleWithProgress.module.id}
                module={moduleWithProgress.module}
                moduleProgressStatus={moduleWithProgress.status}
                currentSectionIndex={moduleWithProgress.currentSectionIndex}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No modules available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
