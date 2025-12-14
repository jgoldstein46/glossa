"use client";

import ModuleCard from "@/components/modules-dashboard/module-card";
import {
  getProgress,
  listModules,
  ProgressStatus,
  Module,
} from "@/lib/api/client";
import { useCallback, useEffect, useState } from "react";

export default function Page() {
  const [modules, setModules] = useState<
    { module: Module; status: ProgressStatus | null }[] | undefined
  >(undefined);

  useEffect(() => {
    const fetchModules = async () => {
      const results = await listModules();
      if (results.data?.success) {
        const resultsWithProgress = await Promise.all(
          results.data.data.map(async (mod) => {
            const userModuleProgressResult = await getProgress({
              path: {
                id: mod.id,
              },
            });
            return {
              module: mod,
              status:
                (userModuleProgressResult.data?.success &&
                  userModuleProgressResult.data.data.status) ||
                null,
            };
          }),
        );
        console.log(" Got results: ", results);
        setModules(resultsWithProgress);
      } else {
        console.error(
          "Got error while fetching modules: ",
          JSON.stringify(results),
        );
      }
    };
    fetchModules();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="flex w-full border-b-2 border-gray-200 p-4">
        <h1 className="text-xl font-bold">Your Modules</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-4 px-2">
        {modules &&
          modules.map((moduleWithProgressStatus) => {
            return (
              <ModuleCard
                key={moduleWithProgressStatus.module.id}
                module={moduleWithProgressStatus.module}
                moduleProgressStatus={moduleWithProgressStatus.status}
              />
            );
          })}
      </div>
    </div>
  );
}
