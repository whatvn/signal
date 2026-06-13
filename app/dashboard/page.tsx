import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { AlertRail } from "@/components/dashboard/AlertRail";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { AppHeader } from "@/components/layout/AppHeader";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AppHeader />

      {/* Metrics bar */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <MetricsChart />
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-5 px-6 pt-5 pb-6 min-h-0 overflow-hidden">
        {/* Live Feed */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <LiveFeed />
        </div>

        {/* Alert Rail */}
        <div className="w-72 shrink-0 overflow-hidden flex flex-col">
          <div className="flex-1 bg-slate-800/50 rounded-lg p-4 overflow-hidden flex flex-col min-h-0">
            <AlertRail />
          </div>
        </div>
      </div>
    </div>
  );
}
