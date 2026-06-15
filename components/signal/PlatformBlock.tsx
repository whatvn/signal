"use client";

import { useEffect, useRef, useState } from "react";
import { IconBrandFacebook, IconBrandTiktok, IconBrandThreads, IconBrandGooglePlay, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { SparklineChart } from "./SparklineChart";
import { CategoryCard } from "./CategoryCard";
import { DetailDrawer } from "./DetailDrawer";

interface PostPreview {
  source_name: string;
  timestamp_relative: string;
  text_preview: string;
}

interface CategoryData {
  subcategory: string;
  count: number;
  previews: PostPreview[];
}

interface TopPost {
  text: string;
  engagement: number;
  sentiment: string;
  url?: string | null;
}

interface SparkPoint {
  hour: number;
  negative: number;
  positive: number;
}

export interface PlatformData {
  postsCount: number;
  commentsCount: number;
  negativeCount: number;
  positiveCount: number;
  alertsCount: number;
  categories: CategoryData[];
  topPosts: TopPost[];
  sparkline: SparkPoint[];
}

const NEGATIVE_SUBCATEGORIES = [
  "fraud_scam",
  "fund_loss",
  "app_bugs",
  "transaction_failure",
  "poor_support",
  "feature_gap",
];
const POSITIVE_SUBCATEGORIES = [
  "promotion_cashback",
  "feature_praise",
  "ux_speed_praise",
  "recommendation",
];
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

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const isNeg = sentiment === "negative";
  return (
    <span
      style={{
        fontSize: 10,
        borderRadius: 4,
        padding: "2px 6px",
        backgroundColor: isNeg ? "#FAECE7" : "#E1F5EE",
        color: isNeg ? "#993C1D" : "#0F6E56",
      }}
    >
      {isNeg ? "Negative" : "Positive"}
    </span>
  );
}

function StatCol({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ flex: 1, padding: "0 8px" }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: color ?? "#1a1a1a",
          lineHeight: 1.1,
          marginBottom: 3,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          textAlign: "center",
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface Props {
  platform: "facebook" | "tiktok" | "threads" | "appstore" | "playstore";
  data: PlatformData;
  window: string;
  onFetch?: () => void;
  profileId?: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  threads: "Threads",
  appstore: "App Store",
  playstore: "Play Store",
};

export function PlatformBlock({ platform, data, window, onFetch, profileId }: Props) {
  const isFb = platform === "facebook";
  const isTh = platform === "threads";
  const isAs = platform === "appstore";
  const isGp = platform === "playstore";
  const windowLabel =
    window === "7d" ? "7 days" : window === "30d" ? "30 days" : "24h";

  const [fetching, setFetching] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => { esRef.current?.close(); };
  }, []);

  async function handleFetch() {
    if (fetching) return;
    setFetching(true);

    await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, platform }),
    });

    esRef.current?.close();
    const es = new EventSource("/api/stream");
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (
          (event.type === "pipeline_stage" && event.stage === "alert" && event.status === "done") ||
          event.type === "pipeline_error"
        ) {
          setFetching(false);
          es.close();
          onFetch?.();
        }
      } catch { /* ignore */ }
    };
  }

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<"negative" | "positive">("negative");

  function openDrawer(cat: CategoryData, sentiment: "negative" | "positive") {
    setSelectedCategory(cat);
    setSelectedSentiment(sentiment);
    setDrawerOpen(true);
  }

  const negCategories = data.categories.filter((c) =>
    NEGATIVE_SUBCATEGORIES.includes(c.subcategory)
  );
  const posCategories = data.categories.filter((c) =>
    POSITIVE_SUBCATEGORIES.includes(c.subcategory)
  );

  const negTotal = negCategories.reduce((s, c) => s + c.count, 0);
  const posTotal = posCategories.reduce((s, c) => s + c.count, 0);

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Header row: 3 columns */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        {/* Platform identity card */}
        <div
          style={{
            width: 160,
            flexShrink: 0,
            backgroundColor: "#ffffff",
            border: "0.5px solid #e5e7eb",
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 12px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: isFb ? "#E6F1FB" : isTh ? "#F0EDF6" : isAs ? "#F5EEF8" : isGp ? "#EAF6EA" : "#F1EFE8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            {isFb ? (
              <IconBrandFacebook size={24} style={{ color: "#1877f2" }} />
            ) : isTh ? (
              <IconBrandThreads size={24} style={{ color: "#000" }} />
            ) : isAs ? (
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.19 1.28-2.17 3.81.03 3.02 2.65 4.03 2.68 4.04l-.06.27zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#555"/>
              </svg>
            ) : isGp ? (
              <IconBrandGooglePlay size={24} style={{ color: "#34a853" }} />
            ) : (
              <IconBrandTiktok size={24} style={{ color: "#111" }} />
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>
            {PLATFORM_LABELS[platform]}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 1.4, marginBottom: 10 }}>
            {data.postsCount.toLocaleString()} signals
            <br />
            last {windowLabel}
          </div>
          <button
            onClick={handleFetch}
            disabled={fetching}
            title={`Fetch ${PLATFORM_LABELS[platform]} only`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 500,
              color: fetching ? "#aaa" : "#555",
              backgroundColor: fetching ? "#f0f0f0" : "#f4f5f7",
              border: "0.5px solid #e5e7eb",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: fetching ? "not-allowed" : "pointer",
              transition: "background-color 0.15s",
            }}
          >
            {fetching
              ? <IconLoader2 size={11} className="animate-spin" />
              : <IconRefresh size={11} />
            }
            {fetching ? "Fetching…" : "Fetch"}
          </button>
        </div>

        {/* Overview stats panel */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
            border: "0.5px solid #e5e7eb",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "0.5px solid #f0f0f0",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Overview</span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
              {PLATFORM_LABELS[platform]} · last {windowLabel}
            </span>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              padding: "10px 0",
              borderBottom: "0.5px solid #f0f0f0",
            }}
          >
            {[
              { value: data.postsCount, label: isFb ? "Posts" : isTh ? "Threads" : (isAs || isGp) ? "Reviews" : "Videos" },
              { value: data.commentsCount, label: "Comments" },
              { value: data.negativeCount, label: "Negative", color: "#D85A30" },
              { value: data.positiveCount, label: "Positive", color: "#1D9E75" },
              { value: data.alertsCount, label: "Alerts", color: "#BA7517" },
            ].map((stat, i, arr) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flex: 1,
                  borderRight: i < arr.length - 1 ? "0.5px solid #f0f0f0" : "none",
                }}
              >
                <StatCol value={stat.value} label={stat.label} color={stat.color} />
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <SparklineChart data={data.sparkline} win={window} />
        </div>

        {/* Top posts table panel */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
            border: "0.5px solid #e5e7eb",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f0f0f0" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
              {isFb ? "Top posts by engagement" : isTh ? "Top threads by engagement" : (isAs || isGp) ? "Top reviews" : "Top videos by engagement"}
            </span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
              {PLATFORM_LABELS[platform]}
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    fontWeight: 400,
                    textAlign: "left",
                    padding: "6px 14px",
                    width: "70%",
                  }}
                >
                  {isFb ? "Post" : isTh ? "Thread" : (isAs || isGp) ? "Review" : "Caption"}
                </th>
                <th
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    fontWeight: 400,
                    textAlign: "right",
                    padding: "6px 8px",
                  }}
                >
                  {isFb ? "Engmt" : isTh ? "Likes" : "Likes"}
                </th>
                <th
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    fontWeight: 400,
                    textAlign: "right",
                    padding: "6px 14px 6px 8px",
                  }}
                >
                  Sentiment
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topPosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      fontSize: 11,
                      color: "#ccc",
                      textAlign: "center",
                      padding: "16px",
                    }}
                  >
                    No data
                  </td>
                </tr>
              ) : (
                data.topPosts.map((post, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "0.5px solid #f9f9f9",
                      cursor: post.url ? "pointer" : "default",
                    }}
                    onClick={() => { if (post.url) open(post.url, "_blank", "noopener,noreferrer"); }}
                  >
                    <td
                      style={{
                        fontSize: 11,
                        color: post.url ? "#3b82f6" : "#666",
                        padding: "7px 14px",
                        maxWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: post.url ? "underline" : "none",
                      }}
                    >
                      {post.text}
                    </td>
                    <td
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#444",
                        textAlign: "right",
                        padding: "7px 8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {post.engagement.toLocaleString()}
                    </td>
                    <td style={{ textAlign: "right", padding: "7px 14px 7px 8px" }}>
                      <SentimentBadge sentiment={post.sentiment} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category grid panel */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "0.5px solid #e5e7eb",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* Negative section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "0.5px solid #f0f0f0",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#993C1D",
              backgroundColor: "#FAECE7",
              borderRadius: 20,
              padding: "2px 10px",
            }}
          >
            Negative
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
            {negTotal} signals
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
          }}
        >
          {negCategories.map((cat) => (
            <CategoryCard
              key={cat.subcategory}
              card={{ ...cat, sentiment: "negative", platform }}
              onClick={() => openDrawer(cat, "negative")}
            />
          ))}
        </div>

        {/* Positive section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            borderTop: "0.5px solid #f0f0f0",
            borderBottom: "0.5px solid #f0f0f0",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0F6E56",
              backgroundColor: "#E1F5EE",
              borderRadius: 20,
              padding: "2px 10px",
            }}
          >
            Positive
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
            {posTotal} signals
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {posCategories.map((cat) => (
            <CategoryCard
              key={cat.subcategory}
              card={{ ...cat, sentiment: "positive", platform }}
              onClick={() => openDrawer(cat, "positive")}
            />
          ))}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedCategory && (
        <DetailDrawer
          open={drawerOpen}
          category={selectedCategory.subcategory}
          categoryLabel={SUBCATEGORY_LABELS[selectedCategory.subcategory] ?? selectedCategory.subcategory}
          platform={platform}
          count={selectedCategory.count}
          sentiment={selectedSentiment}
          window={window}
          onClose={() => setDrawerOpen(false)}
          profileId={profileId}
        />
      )}
    </div>
  );
}
