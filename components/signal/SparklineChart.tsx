"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface SparkPoint {
  hour: number;
  negative: number;
  positive: number;
}

export function SparklineChart({ data }: { data: SparkPoint[] }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 10, color: "#ccc" }}>No data</span>
      </div>
    );
  }

  return (
    <div style={{ height: 60, padding: "8px 14px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="negative"
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
