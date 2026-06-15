"use client";

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

interface SparkPoint {
  hour: number;
  negative: number;
  positive: number;
}

function formatLabel(ts: number, win: string): string {
  const d = new Date(ts * 1000);
  if (win === "24h") {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label, win }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
  win: string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 11,
    }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{formatLabel(label, win)}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

export function SparklineChart({ data, win = "24h" }: { data: SparkPoint[]; win?: string }) {
  if (data.length === 0) {
    return (
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: "#ccc" }}>No data</span>
      </div>
    );
  }

  // Only label every Nth tick to avoid crowding
  const step = win === "24h" ? 4 : win === "7d" ? 1 : 5;
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.hour);

  return (
    <div style={{ height: 80, padding: "6px 14px 4px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="hour"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            ticks={ticks}
            tickFormatter={(ts) => formatLabel(ts, win)}
            tick={{ fill: "#9ca3af", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as { name: string; value: number; color: string }[]}
                label={props.label as number}
                win={win}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="negative"
            name="Negative"
            stroke="#D85A30"
            strokeWidth={1.5}
            fill="#D85A30"
            fillOpacity={0.07}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="positive"
            name="Positive"
            stroke="#1D9E75"
            strokeWidth={1.5}
            fill="#1D9E75"
            fillOpacity={0.07}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
