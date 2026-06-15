"use client";

import { useEffect, useRef, useState } from "react";

type StageStatus = "idle" | "running" | "done" | "error";
type LogLevel = "info" | "warn" | "error";

interface Stage {
  key: string;
  label: string;
  icon: string;
  status: StageStatus;
  count?: number;
}

interface LogEntry {
  ts: number;
  stage: string;
  level: LogLevel;
  message: string;
}

const INITIAL_STAGES: Stage[] = [
  { key: "fetch", label: "Fetch", icon: "⬇", status: "idle" },
  { key: "extract", label: "Extract", icon: "✂", status: "idle" },
  { key: "classify", label: "Classify", icon: "🧠", status: "idle" },
  { key: "alert", label: "Alert", icon: "🔔", status: "idle" },
];

const STATUS_COLORS: Record<StageStatus, { ring: string; bg: string; dot: string }> = {
  idle:    { ring: "none",                  bg: "#f4f5f7", dot: "#d1d5db" },
  running: { ring: "2px solid #f59e0b",     bg: "#fef3c7", dot: "#f59e0b" },
  done:    { ring: "2px solid #1D9E75",     bg: "#E1F5EE", dot: "#1D9E75" },
  error:   { ring: "2px solid #ef4444",     bg: "#fee2e2", dot: "#ef4444" },
};

const LOG_COLORS: Record<LogLevel, string> = {
  info:  "#6b7280",
  warn:  "#d97706",
  error: "#ef4444",
};

const STAGE_LABEL: Record<string, string> = {
  fetch: "fetch",
  extract: "extract",
  classify: "classify",
  alert: "alert",
};

function StatusDot({ status }: { status: StageStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: STATUS_COLORS[status].dot,
      }}
    />
  );
}

interface Profile {
  id: number;
  name: string;
  isDefault: boolean;
}

export function PipelinePanel() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<number | undefined>(undefined);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pipelineLastCompleted, setPipelineLastCompleted] = useState<number | null | undefined>(undefined);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => {
        setProfiles(data);
        const def = data.find((p) => p.isDefault) ?? data[0];
        if (def && profileId === undefined) setProfileId(def.id);
      })
      .catch(() => {});
  }, []);

  // Fetch pipeline state whenever profileId changes
  useEffect(() => {
    if (profileId === undefined) return;
    setPipelineLastCompleted(undefined);
    fetch(`/api/pipeline/state?profileId=${profileId}`)
      .then((r) => r.json())
      .then((d) => setPipelineLastCompleted(d.lastCompletedAt ?? null))
      .catch(() => setPipelineLastCompleted(null));
  }, [profileId]);

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
          if (event.stage === "fetch" && event.status === "running") {
            setLogs([]);
            setStages(INITIAL_STAGES.map((s) => ({ ...s, status: "idle" })));
          }
          if (event.stage === "alert" && event.status === "done") {
            setRunning(false);
            const now = Math.floor(Date.now() / 1000);
            setLastRun(now);
            setPipelineLastCompleted(now);
          }
        }

        if (event.type === "pipeline_log") {
          setLogs((prev) => [
            ...prev,
            { ts: event.ts ?? Date.now(), stage: event.stage, level: event.level, message: event.message },
          ]);
        }

        if (event.type === "pipeline_error") {
          setRunning(false);
          setStages((prev) =>
            prev.map((s) => ({ ...s, status: s.status === "running" ? "error" : s.status }))
          );
          setLogs((prev) => [
            ...prev,
            { ts: Date.now(), stage: "pipeline", level: "error", message: event.message },
          ]);
        }
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, []);

  // Auto-scroll log to bottom on new entries
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function handleRun() {
    setRunning(true);
    setLogs([]);
    setStages(INITIAL_STAGES.map((s) => ({ ...s, status: "idle" })));
    await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
  }

  function timeAgo(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toISOString().slice(11, 23); // HH:MM:SS.mmm
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Stage tracker */}
      <div style={{ padding: 16, borderBottom: "0.5px solid #e5e7eb" }}>
        {lastRun && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Last run: {timeAgo(lastRun)}</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
          {stages.map((stage, i) => (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    backgroundColor: STATUS_COLORS[stage.status].bg,
                    outline: STATUS_COLORS[stage.status].ring,
                    transition: "all 0.2s",
                  }}
                >
                  {stage.icon}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <StatusDot status={stage.status} />
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{stage.label}</span>
                </div>
                {stage.count !== undefined && stage.status === "done" && (
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{stage.count}</span>
                )}
              </div>
              {i < stages.length - 1 && (
                <div style={{ width: 24, height: 1, backgroundColor: "#e5e7eb", marginBottom: 16, flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={profileId ?? ""}
            onChange={(e) => setProfileId(parseInt(e.target.value, 10))}
            style={{
              flex: 1,
              fontSize: 12,
              backgroundColor: "#f4f5f7",
              border: "0.5px solid #e5e7eb",
              borderRadius: 6,
              padding: "6px 10px",
              color: "#1a1a1a",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.isDefault ? " (default)" : ""}</option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: running ? "#9ca3af" : "#ffffff",
              backgroundColor: running ? "#f4f5f7" : "#1D9E75",
              border: "0.5px solid " + (running ? "#e5e7eb" : "#1D9E75"),
              borderRadius: 6,
              padding: "6px 14px",
              cursor: running ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
            }}
          >
            {running ? "Running…" : "Run Now"}
          </button>
        </div>
        {pipelineLastCompleted !== undefined && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
            {pipelineLastCompleted === null
              ? "First run — will fetch last 7 days"
              : `Incremental — fetching new posts since ${new Date(pipelineLastCompleted * 1000).toISOString().replace("T", " ").slice(0, 16)}`}
          </div>
        )}
      </div>

      {/* Log console */}
      <div
        style={{
          backgroundColor: "#fafafa",
          height: 280,
          overflowY: "auto",
          fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d1d5db",
              fontSize: 12,
            }}
          >
            {running ? "Waiting for output…" : "Run the pipeline to see logs"}
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {logs.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "1px 12px",
                  backgroundColor: entry.level === "error" ? "#fff5f5" : "transparent",
                }}
              >
                <span style={{ color: "#c4c9d0", flexShrink: 0 }}>{formatTime(entry.ts)}</span>
                <span
                  style={{
                    color: "#a5b4c4",
                    flexShrink: 0,
                    width: 52,
                    textAlign: "right",
                  }}
                >
                  [{STAGE_LABEL[entry.stage] ?? entry.stage}]
                </span>
                <span style={{ color: LOG_COLORS[entry.level], whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {entry.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
