import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ModuleHeader({
  moduleTitle,
  currentSectionIndex,
  totalSectionsCount,
}: {
  moduleTitle: string;
  currentSectionIndex?: number;
  totalSectionsCount?: number;
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link
          href="/home"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">
            {moduleTitle}
          </h1>
          <p className="text-sm text-gray-500">
            {currentSectionIndex !== undefined &&
            totalSectionsCount !== undefined
              ? `Section ${currentSectionIndex + 1} of ${totalSectionsCount}`
              : "Module Recap"}
          </p>
        </div>
      </div>
    </header>
  );
}
