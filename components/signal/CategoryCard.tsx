"use client";

import { IconBrandFacebook, IconBrandTiktok, IconBrandThreads, IconBrandGooglePlay, IconArrowRight } from "@tabler/icons-react";

interface PreviewItem {
  source_name: string;
  timestamp_relative: string;
  text_preview: string;
}

interface CategoryCardData {
  subcategory: string;
  count: number;
  previews: PreviewItem[];
  sentiment: "negative" | "positive";
  platform: "facebook" | "tiktok" | "threads" | "appstore" | "playstore";
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  fraud_scam: "Fraud / scam",
  fund_loss: "Fund loss",
  app_bugs: "App bugs",
  transaction_failure: "Txn failure",
  poor_support: "Poor support",
  feature_gap: "Feature gap",
  promotion_cashback: "Promo / cashback",
  feature_praise: "Feature praise",
  ux_speed_praise: "UX / speed",
  recommendation: "Recommendation",
};

function PlatformIcon({ platform }: { platform: "facebook" | "tiktok" | "threads" | "appstore" | "playstore" }) {
  if (platform === "facebook") return <IconBrandFacebook size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />;
  if (platform === "threads") return <IconBrandThreads size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />;
  if (platform === "playstore") return <IconBrandGooglePlay size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />;
  if (platform === "appstore") return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.19 1.28-2.17 3.81.03 3.02 2.65 4.03 2.68 4.04l-.06.27zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#9ca3af"/>
    </svg>
  );
  return <IconBrandTiktok size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />;
}

export function CategoryCard({
  card,
  onClick,
}: {
  card: CategoryCardData;
  onClick: () => void;
}) {
  const isNeg = card.sentiment === "negative";
  const valueColor = isNeg ? "#D85A30" : "#1D9E75";
  const hoverBorderColor = isNeg ? "#F0997B" : "#5DCAA5";
  const label = SUBCATEGORY_LABELS[card.subcategory] ?? card.subcategory;

  return (
    <div
      onClick={onClick}
      className="category-card"
      data-sentiment={card.sentiment}
      style={{
        backgroundColor: "#ffffff",
        borderRight: "0.5px solid #f0f0f0",
        borderBottom: "0.5px solid #f0f0f0",
        padding: "10px 12px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minWidth: 0,
        "--hover-border": hoverBorderColor,
      } as React.CSSProperties}
    >
      {/* Category name */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#444",
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>

      {/* Count */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: valueColor,
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {card.count}
      </div>

      {/* Preview items */}
      {card.previews.length === 0 && (
        <div style={{ fontSize: 10, color: "#ccc", marginBottom: 6 }}>No data</div>
      )}
      {card.previews.slice(0, 2).map((item, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div
            className="flex items-center gap-1"
            style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}
          >
            <PlatformIcon platform={card.platform} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 80,
              }}
            >
              {item.source_name}
            </span>
            <span>·</span>
            <span style={{ whiteSpace: "nowrap" }}>{item.timestamp_relative}</span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#888",
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.text_preview}
          </div>
        </div>
      ))}

      {/* View all row */}
      <div
        style={{
          borderTop: "0.5px solid #f5f5f5",
          marginTop: "auto",
          paddingTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <IconArrowRight size={11} style={{ color: "#bbb" }} />
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{card.count} posts</span>
      </div>
    </div>
  );
}
