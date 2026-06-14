"use client";

interface Summary {
  totalSignals: number;
  negativeCount: number;
  negativeChange: number;
  positiveCount: number;
  positiveChange: number;
  alertsCount: number;
  criticalAlert: string | null;
}

function MetricCard({
  label,
  value,
  subLabel,
  accentColor,
  fillColor,
  textColor,
  borderColor,
}: {
  label: string;
  value: string | number;
  subLabel: string;
  accentColor: string;
  fillColor: string;
  textColor: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: `0.5px solid ${borderColor}`,
        borderRadius: 10,
        padding: "12px 14px",
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: textColor,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: accentColor,
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#999" }}>{subLabel}</div>
    </div>
  );
}

function pctLabel(n: number) {
  if (n === 0) return "vs prev period";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}% vs prev period`;
}

export function SummaryBar({ summary, window }: { summary: Summary; window: string }) {
  const windowLabel =
    window === "7d" ? "7 days" : window === "30d" ? "30 days" : "24h";

  return (
    <div className="flex gap-2.5 mb-2.5">
      <MetricCard
        label="Total signals"
        value={summary.totalSignals.toLocaleString()}
        subLabel={`Facebook + TikTok · ${windowLabel}`}
        accentColor="#1a1a1a"
        fillColor="#f4f5f7"
        textColor="#666"
        borderColor="#e5e7eb"
      />
      <MetricCard
        label="Negative"
        value={summary.negativeCount.toLocaleString()}
        subLabel={pctLabel(summary.negativeChange)}
        accentColor="#D85A30"
        fillColor="#FAECE7"
        textColor="#993C1D"
        borderColor="#F0997B"
      />
      <MetricCard
        label="Positive"
        value={summary.positiveCount.toLocaleString()}
        subLabel={pctLabel(summary.positiveChange)}
        accentColor="#1D9E75"
        fillColor="#E1F5EE"
        textColor="#0F6E56"
        borderColor="#5DCAA5"
      />
      <MetricCard
        label="Alerts"
        value={summary.alertsCount}
        subLabel={summary.criticalAlert ?? "No active alerts"}
        accentColor="#BA7517"
        fillColor="#FAEEDA"
        textColor="#854F0B"
        borderColor="#FAC775"
      />
    </div>
  );
}
