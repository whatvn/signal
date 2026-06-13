import { PipelinePanel } from "@/components/dashboard/PipelinePanel";
import { AppHeader } from "@/components/layout/AppHeader";

export default function PipelinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AppHeader />

      <div className="flex-1 flex items-start justify-center px-6 pt-10">
        <div className="w-full max-w-xl">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6">
            Agent Pipeline
          </h2>
          <PipelinePanel />
        </div>
      </div>
    </div>
  );
}
