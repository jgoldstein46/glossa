"use client";
import {
  getModule,
  getModuleSections,
  getProgress,
  Module,
  Section,
  UserModuleProgress,
} from "@/lib/api/client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`modules-sections:module_id=${params.id}`, {
        config: {
          private: true,
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "modules",
          filter: `id=eq.${params.id}`,
        },
        updateModuleOnChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sections",
          filter: `module_id=eq.${params.id}`,
        },
        updateSectionsOnChange,
      )
      .subscribe();
    console.log("Subscribed to modules and sections channel:", channel);
    return () => {
      supabase.removeChannel(channel);
    };

    function updateSectionsOnChange(
      payload: RealtimePostgresChangesPayload<{
        [key: string]: unknown;
      }>,
    ) {
      console.log("Got new payload while listening to module sections:", payload);
      const newSection = payload.new as Section;
      setSections((sections) => {
        return [...sections.filter((section) => section.id !== newSection.id), newSection];
      });
    }

    function updateModuleOnChange(
      payload: RealtimePostgresChangesPayload<{
        [key: string]: unknown;
      }>,
    ) {
      console.log("Got payload while listening to module:", payload);
      setModule(payload.new as Module);
    }
  }, [params.id]);

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
