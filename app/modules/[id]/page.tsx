"use client";

import TranscriptionButton from "@/components/module/transcription-button";
import { fetchElevenLabsScribeToken } from "@/lib/actions/fetch-elevenlabs-scribe-token";
import {
  getModule,
  getModuleSections,
  getProgress,
  Module,
  Section,
  UserModuleProgress,
} from "@/lib/api/client";
import clsx from "clsx";
import { Circle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page(
  props: Promise<{
    params: {
      id: string;
    };
  }>,
) {
  const [moduleResult, setModuleResult] = useState<Module | null>(null);
  const [moduleSections, setModuleSections] = useState<Section[] | null>(null);
  const [userModuleProgress, setUserModuleProgress] =
    useState<UserModuleProgress | null>(null);
  const [scribeToken, setScribeToken] = useState<string | null>(null);
  const params: { id: string } = useParams();

  useEffect(() => {
    async function loadModuleData() {
      const moduleResult = await getModule({
        path: {
          id: params.id,
        },
      });

      const moduleSectionsResult = await getModuleSections({
        path: { id: params.id },
      });

      const userModuleProgress = await getProgress({
        path: {
          id: params.id,
        },
      });

      if (moduleResult.data?.success) {
        setModuleResult(moduleResult.data.data);
      }
      if (moduleSectionsResult.data?.success) {
        setModuleSections(moduleSectionsResult.data.data);
      }
      if (userModuleProgress.data?.success) {
        setUserModuleProgress(userModuleProgress.data.data);
      }
    }
    loadModuleData();
  }, [params.id]);

  useEffect(() => {
    async function loadScribeToken() {
      const { token: scribeToken, message } =
        await fetchElevenLabsScribeToken();
      setScribeToken(scribeToken || null);
    }
    loadScribeToken();
  }, []);

  return (
    <div className="h-screen flex flex-col items-center w-full">
      <div className="p-4 flex w-full">
        {moduleSections &&
          userModuleProgress &&
          moduleSections.map((section, index) => {
            return (
              <div key={section.id} className="flex">
                <Circle
                  className={clsx("border border-gray-200 ", {
                    "bg-gray-200 ":
                      index <= userModuleProgress.current_section_index,
                  })}
                />
                <div className="grow text-gray-200 h-2 w-full" />
              </div>
            );
          })}
      </div>
      <div className="grow flex items-center justify-center"></div>
      <TranscriptionButton token={scribeToken} />
    </div>
  );
}
