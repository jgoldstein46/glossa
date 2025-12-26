"use client";
import {
  getModule,
  getModuleSections,
  getProgress,
  Module,
  Section,
  UserModuleProgress,
} from "@/lib/api/client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function useModule() {
  const params: { id: string } = useParams();

  // Data states
  const [module, setModule] = useState<Module | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [progress, setProgress] = useState<UserModuleProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const [moduleResult, sectionsResult, progressResult] = await Promise.all([
        getModule({ path: { id: params.id } }),
        getModuleSections({ path: { id: params.id } }),
        getProgress({ path: { module_id: params.id } }),
      ]);

      if (moduleResult.data?.success) {
        setModule(moduleResult.data.data);
      }

      if (sectionsResult.data?.success) {
        const sortedSections = [...sectionsResult.data.data].sort(
          (a, b) => a.order_index - b.order_index,
        );
        setSections(sortedSections);
      }

      if (progressResult.data?.success) {
        setProgress(progressResult.data.data);
      }

      setIsLoading(false);
    }

    loadData();
  }, [params.id]);

  return {
    module,
    setModule,
    sections,
    setSections,
    progress,
    setProgress,
    isLoading,
    setIsLoading,
  };
}
