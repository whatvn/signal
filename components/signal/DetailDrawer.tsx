"use client";

import { useEffect, useState } from "react";
import {
  IconX,
  IconBrandFacebook,
  IconBrandTiktok,
  IconBrandThreads,
  IconHeart,
  IconMessageCircle,
  IconExternalLink,
} from "@tabler/icons-react";

interface DrawerPost {
  id: string;
  platform: string;
  sourceUrl: string | null;
  authorHandle: string | null;
  contentText: string;
  fetchedAt: number;
  sentiment: string;
  subcategory: string;
  confidence: number;
  commentCount: number;
}

interface Props {
  open: boolean;
  category: string;
  categoryLabel: string;
  platform: "facebook" | "tiktok" | "threads" | "appstore" | "playstore";
  count: number;
  sentiment: "negative" | "positive";
  window: string;
  onClose: () => void;
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

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "tiktok") return <IconBrandTiktok size={13} style={{ color: "#9ca3af" }} />;
  if (platform === "threads") return <IconBrandThreads size={13} style={{ color: "#9ca3af" }} />;
  return <IconBrandFacebook size={13} style={{ color: "#9ca3af" }} />;
}

export function DetailDrawer({ open, category, categoryLabel, platform, count, sentiment, window, onClose }: Props) {
  const [posts, setPosts] = useState<DrawerPost[]>([]);
  const [loading, setLoading] = useState(false);

  const isNeg = sentiment === "negative";
  const pillBg = isNeg ? "#FAECE7" : "#E1F5EE";
  const pillText = isNeg ? "#993C1D" : "#0F6E56";
  const sentimentLabel = isNeg ? "Negative" : "Positive";

  useEffect(() => {
    if (!open || !category) return;
    setLoading(true);
    setPosts([]);
    fetch(`/api/posts?platform=${platform}&subcategory=${category}&window=${window}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, category, platform, window]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.15)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 150ms ease",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          zIndex: 51,
          backgroundColor: "#ffffff",
          borderLeft: "0.5px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 150ms ease",
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            padding: "14px 16px",
            borderBottom: "0.5px solid #f0f0f0",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
              {SUBCATEGORY_LABELS[category] ?? category}
            </div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
              {count} posts · {platform.charAt(0).toUpperCase() + platform.slice(1)} · {sentimentLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              border: "0.5px solid #e5e7eb",
              borderRadius: 6,
              backgroundColor: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconX size={14} style={{ color: "#666" }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {loading && (
            <div
              style={{
                fontSize: 12,
                color: "#999",
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              Loading…
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "#ccc",
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              No posts in this category
            </div>
          )}

          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "0.5px solid #ebebeb",
                borderRadius: 8,
                padding: 11,
              }}
            >
              {/* Header row */}
              <div
                className="flex items-center gap-1.5"
                style={{ marginBottom: 6 }}
              >
                <PlatformIcon platform={post.platform} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#444", flex: 1 }}>
                  {post.authorHandle ?? (post.platform === "tiktok" ? "@user" : post.platform === "threads" ? "@threads_user" : "Facebook user")}
                </span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{timeAgo(post.fetchedAt)}</span>
                {post.sourceUrl && (
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View original"
                    style={{ color: "#9ca3af", display: "flex", alignItems: "center" }}
                    className="hover:text-gray-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconExternalLink size={13} />
                  </a>
                )}
              </div>

              {/* Post text */}
              <p
                style={{
                  fontSize: 12,
                  color: "#333",
                  lineHeight: 1.5,
                  marginBottom: 8,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {post.contentText || <em style={{ color: "#ccc" }}>No content</em>}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#9ca3af" }}>
                  <IconHeart size={12} />
                  {post.commentCount}
                </span>
                <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#9ca3af" }}>
                  <IconMessageCircle size={12} />
                  {post.commentCount}
                </span>
                <span style={{ marginLeft: "auto" }}>
                  <span
                    style={{
                      fontSize: 10,
                      backgroundColor: pillBg,
                      color: pillText,
                      borderRadius: 4,
                      padding: "2px 6px",
                    }}
                  >
                    {SUBCATEGORY_LABELS[post.subcategory] ?? post.subcategory}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
