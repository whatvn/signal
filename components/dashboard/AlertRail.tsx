"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  ruleName: string;
  subcategory: string;
  count: number;
  windowMinutes: number;
  threshold: number;
  firedAt: number;
  acknowledgedAt: number | null;
  samplePostIds: string;
}

interface RuleCount {
  name: string;
  label: string;
  subcategory: string;
  threshold: number;
  windowMinutes: number;
  current: number;
}

const RULE_LABELS: Record<string, string> = {
  fraud_spike_1h: "Fraud Spike",
  fund_loss_spike_1h: "Fund Loss Spike",
  crash_spike_2h: "Crash Spike",
};

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function RuleGauge({ rule }: { rule: RuleCount }) {
  const pct = Math.min((rule.current / rule.threshold) * 100, 100);
  const isCritical = rule.current >= rule.threshold;
  const isWarning = pct >= 60;

  const barColor = isCritical ? "#FF6B6B" : isWarning ? "#F59E0B" : "#4ECDC4";

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{rule.label}</span>
        <span
          className="text-xs font-semibold tabular-nums"
          style={{ color: isCritical ? "#FF6B6B" : isWarning ? "#F59E0B" : "#94a3b8" }}
        >
          {rule.current}
          <span className="text-slate-600 font-normal">/{rule.threshold}</span>
          <span className="text-slate-600 font-normal ml-1">({rule.windowMinutes}m)</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export function AlertRail() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState<RuleCount[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  function loadCounts() {
    fetch("/api/alerts/counts")
      .then((r) => r.json())
      .then((d) => setCounts(d.counts ?? []));
  }

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []));

    loadCounts();

    // Refresh counts every 2 minutes
    const interval = setInterval(loadCounts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "new_alert") {
          const alert = event.alert as Alert;
          setAlerts((prev) => [alert, ...prev]);
          setNewIds((prev) => new Set([...prev, alert.id]));
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(alert.id);
              return next;
            });
          }, 5000);
          // Refresh counts when a new alert fires
          loadCounts();
        }
        if (event.type === "new_post") {
          loadCounts();
        }
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, []);

  async function acknowledge(id: string) {
    await fetch(`/api/alerts/${id}/acknowledge`, { method: "POST" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 shrink-0 flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "#FF6B6B" }}
        />
        Critical Alerts
        {alerts.length > 0 && (
          <span className="ml-auto text-xs bg-red-900/50 text-red-400 rounded-full px-2 py-0.5">
            {alerts.length}
          </span>
        )}
      </h2>

      {/* Rule gauges */}
      {counts.length > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-700/50 shrink-0">
          {counts.map((rule) => (
            <RuleGauge key={rule.name} rule={rule} />
          ))}
        </div>
      )}

      {/* Fired alerts */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {alerts.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">
            No active alerts
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg p-3 border ${
                newIds.has(alert.id) ? "alert-pulse" : ""
              }`}
              style={{
                backgroundColor: "rgba(255, 107, 107, 0.08)",
                borderColor: "rgba(255, 107, 107, 0.4)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-400">
                    {RULE_LABELS[alert.ruleName] ?? alert.ruleName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {alert.count} mentions in {alert.windowMinutes}min
                    <span className="text-slate-600 ml-1">
                      (threshold: {alert.threshold})
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {timeAgo(alert.firedAt)}
                  </p>
                </div>
                <button
                  onClick={() => acknowledge(alert.id)}
                  className="text-xs text-slate-500 hover:text-slate-300 shrink-0 mt-0.5"
                  title="Acknowledge"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
