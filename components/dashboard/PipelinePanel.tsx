"use client";

import { useEffect, useState } from "react";

type StageStatus = "idle" | "running" | "done" | "error";

interface Stage {
  key: string;
  label: string;
  icon: string;
  status: StageStatus;
  count?: number;
}

const INITIAL_STAGES: Stage[] = [
  { key: "fetch", label: "Fetch", icon: "⬇", status: "idle" },
  { key: "extract", label: "Extract", icon: "✂", status: "idle" },
  { key: "classify", label: "Classify", icon: "🧠", status: "idle" },
  { key: "alert", label: "Alert", icon: "🔔", status: "idle" },
];

function StatusDot({ status }: { status: StageStatus }) {
  const colors: Record<StageStatus, string> = {
    idle: "bg-slate-600",
    running: "bg-yellow-400 animate-pulse",
    done: "bg-teal-brand",
    error: "bg-coral",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

export function PipelinePanel() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("ZaloPay");

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "pipeline_stage") {
          setStages((prev) =>
            prev.map((s) =>
              s.key === event.stage
                ? { ...s, status: event.status as StageStatus, count: event.count }
                : s
            )
          );
          if (event.stage === "alert" && event.status === "done") {
            setRunning(false);
            setLastRun(Math.floor(Date.now() / 1000));
          }
          if (event.stage === "fetch" && event.status === "running") {
            setStages(INITIAL_STAGES.map((s) => ({ ...s, status: "idle" })));
          }
        }
        if (event.type === "pipeline_error") {
          setRunning(false);
          setStages((prev) => prev.map((s) => ({ ...s, status: s.status === "running" ? "error" : s.status })));
        }
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, []);

  async function handleRun() {
    setRunning(true);
    setStages(INITIAL_STAGES.map((s) => ({ ...s, status: "idle" })));
    await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
  }

  function timeAgo(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      {lastRun && (
        <div className="flex justify-end mb-3">
          <span className="text-xs text-slate-500">Last run: {timeAgo(lastRun)}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
                  stage.status === "running"
                    ? "bg-yellow-400/20 ring-2 ring-yellow-400"
                    : stage.status === "done"
                    ? "bg-teal-brand/20"
                    : stage.status === "error"
                    ? "bg-coral/20"
                    : "bg-slate-700"
                }`}
              >
                {stage.icon}
              </div>
              <div className="flex items-center gap-1">
                <StatusDot status={stage.status} />
                <span className="text-xs text-slate-400">{stage.label}</span>
              </div>
              {stage.count !== undefined && stage.status === "done" && (
                <span className="text-xs text-slate-500">{stage.count}</span>
              )}
            </div>
            {i < stages.length - 1 && (
              <div className="w-6 h-px bg-slate-600 mb-4 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 text-sm bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-teal-brand"
          placeholder="Keyword"
        />
        <button
          onClick={handleRun}
          disabled={running}
          className={`text-sm px-4 py-1.5 rounded font-medium transition-colors ${
            running
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "text-slate-900 hover:opacity-90"
          }`}
          style={!running ? { backgroundColor: "#4ECDC4" } : {}}
        >
          {running ? "Running..." : "Run Now"}
        </button>
      </div>
    </div>
  );
}
