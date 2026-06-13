"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const NEGATIVE_SUBCATEGORIES = [
  { key: "fraud_scam", label: "Fraud/Scam" },
  { key: "fund_loss", label: "Fund Loss" },
  { key: "app_bugs", label: "App Bugs" },
  { key: "transaction_failure", label: "Txn Failure" },
  { key: "poor_support", label: "Poor Support" },
  { key: "feature_gap", label: "Feature Gap" },
];

const POSITIVE_SUBCATEGORIES = [
  { key: "promotion_cashback", label: "Promo/Cashback" },
  { key: "feature_praise", label: "Feature Praise" },
  { key: "ux_speed_praise", label: "UX/Speed" },
  { key: "recommendation", label: "Recommendation" },
];

const CORAL_SHADES = ["#FF6B6B", "#FF8E8E", "#FFB1B1", "#FFD4D4", "#FFCECE", "#FFE0E0"];
const TEAL_SHADES = ["#4ECDC4", "#7DD9D2", "#ABE5E0", "#C9EDEB"];

interface SeriesPoint {
  hour: number;
  [key: string]: number;
}

function formatHour(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getHours()}:00`;
}

export function MetricsChart() {
  const [series, setSeries] = useState<SeriesPoint[]>([]);

  useEffect(() => {
    function load() {
      fetch("/api/metrics")
        .then((r) => r.json())
        .then((d) => setSeries(d.series ?? []));
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (series.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-center h-40 text-slate-500 text-sm">
        No data yet — run the pipeline to see metrics
      </div>
    );
  }

  const chartData = series.map((s) => ({
    ...s,
    hour: formatHour(s.hour),
  }));

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Signal Distribution — Last 24h
      </h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="hour"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
          {NEGATIVE_SUBCATEGORIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="neg"
              fill={CORAL_SHADES[i] ?? "#FF6B6B"}
              maxBarSize={40}
            />
          ))}
          {POSITIVE_SUBCATEGORIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="pos"
              fill={TEAL_SHADES[i] ?? "#4ECDC4"}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
