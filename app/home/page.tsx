import ModuleCard from "@/components/modules-dashboard/module-card";
import { ProgressStatus } from "@/lib/api/client";
import { Module, UserModuleProgressWithModule } from "@/types/database";

export default async function Page() {
  async function fetchModules(): Promise<
    { module: Module; status: ProgressStatus | null }[]
  > {
    return await new Promise((resolve) => {
      return resolve(
        Array.from({ length: 10 }).map((_, indx) => ({
          status:
            indx % 3 === 0 ? "in_progress" : indx % 2 ? "completed" : null,
          module: {
            id: String(indx),
            title: "Test Module",
            description: "Test Module Description",
            difficulty: "intermediate",
            estimated_duration_mins: 5,
            topic: "Test Topic",
            thumbnail_url: null,
            is_published: false,
          } as Module,
        })),
      );
    });
  }
  const modules: { module: Module; status: ProgressStatus | null }[] =
    await fetchModules();

  return (
    <div className="min-h-screen">
      <div className="flex w-full border-b-2 border-gray-200 p-4">
        <h1 className="text-xl font-bold">Your Modules</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-4 px-2">
        {modules.map((moduleWithProgressStatus) => {
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
