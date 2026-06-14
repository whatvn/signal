import { db } from "@/db";
import { posts, classifications, alerts } from "@/db/schema";
import { eq, gte, and, desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
const ALL_SUBCATEGORIES = [...NEGATIVE_SUBCATEGORIES, ...POSITIVE_SUBCATEGORIES];

const ALERT_RULE_LABELS: Record<string, string> = {
  fraud_spike_1h: "Fraud spike on Facebook",
  fund_loss_spike_1h: "Fund loss spike",
  crash_spike_2h: "App crash surge",
};

function windowSeconds(w: string): number {
  if (w === "7d") return 7 * 24 * 3600;
  if (w === "30d") return 30 * 24 * 3600;
  return 24 * 3600;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export async function GET(req: NextRequest) {
  const window = req.nextUrl.searchParams.get("window") ?? "24h";
  const since = Math.floor(Date.now() / 1000) - windowSeconds(window);
  const prevSince = since - windowSeconds(window);

  const rows = await db
    .select({
      id: posts.id,
      platform: posts.platform,
      authorHandle: posts.authorHandle,
      contentText: posts.contentText,
      fetchedAt: posts.fetchedAt,
      sentiment: classifications.sentiment,
      subcategory: classifications.subcategory,
      commentCount: classifications.commentCount,
      classifiedAt: classifications.classifiedAt,
      sourceUrl: posts.sourceUrl,
    })
    .from(posts)
    .innerJoin(classifications, eq(classifications.postId, posts.id))
    .where(gte(classifications.classifiedAt, since))
    .orderBy(desc(classifications.classifiedAt));

  // Prev period for delta
  const prevRows = await db
    .select({ sentiment: classifications.sentiment })
    .from(classifications)
    .innerJoin(posts, eq(posts.id, classifications.postId))
    .where(
      and(gte(classifications.classifiedAt, prevSince), sql`${classifications.classifiedAt} < ${since}`)
    );

  const activeAlerts = await db
    .select()
    .from(alerts)
    .where(sql`${alerts.acknowledgedAt} IS NULL`)
    .orderBy(desc(alerts.firedAt));

  function buildPlatformData(platform: string) {
    const pr = rows.filter((r) => r.platform === platform);
    const negRows = pr.filter((r) => r.sentiment === "negative");
    const posRows = pr.filter((r) => r.sentiment === "positive");

    const categories = ALL_SUBCATEGORIES.map((sub) => {
      const catRows = pr.filter((r) => r.subcategory === sub);
      const fallbackHandle = platform === "facebook" ? "Facebook user" : platform === "threads" ? "@threads" : "@tiktok";
      const previews = catRows.slice(0, 2).map((r) => ({
        source_name: r.authorHandle ?? fallbackHandle,
        timestamp_relative: timeAgo(r.classifiedAt),
        text_preview: r.contentText.slice(0, 100),
      }));
      return { subcategory: sub, count: catRows.length, previews };
    });

    const topPosts = [...pr]
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 4)
      .map((r) => ({
        text: r.contentText.slice(0, 80),
        engagement: r.commentCount,
        sentiment: r.sentiment,
        url: r.sourceUrl ?? null,
      }));

    // Hourly sparkline — pre-fill all 24 buckets so gaps show as zeros
    const nowHour = Math.floor(Date.now() / 1000 / 3600) * 3600;
    const bucketMap = new Map<number, { negative: number; positive: number }>();
    for (let i = 23; i >= 0; i--) {
      bucketMap.set(nowHour - i * 3600, { negative: 0, positive: 0 });
    }
    for (const r of pr) {
      const hourTs = Math.floor(r.classifiedAt / 3600) * 3600;
      if (!bucketMap.has(hourTs)) continue; // outside the 24h window
      const b = bucketMap.get(hourTs)!;
      if (r.sentiment === "negative") b.negative++;
      else if (r.sentiment === "positive") b.positive++;
    }
    const sparkline = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, counts]) => ({ hour, ...counts }));

    return {
      postsCount: pr.length,
      commentsCount: pr.reduce((s, r) => s + r.commentCount, 0),
      negativeCount: negRows.length,
      positiveCount: posRows.length,
      alertsCount: activeAlerts.length,
      categories,
      topPosts,
      sparkline,
    };
  }

  const facebook = buildPlatformData("facebook");
  const tiktok = buildPlatformData("tiktok");
  const threads = buildPlatformData("threads");

  const totalNeg = rows.filter((r) => r.sentiment === "negative").length;
  const totalPos = rows.filter((r) => r.sentiment === "positive").length;
  const prevNeg = prevRows.filter((r) => r.sentiment === "negative").length;
  const prevPos = prevRows.filter((r) => r.sentiment === "positive").length;

  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);

  const criticalAlert =
    activeAlerts.length > 0
      ? (ALERT_RULE_LABELS[activeAlerts[0].ruleName] ?? activeAlerts[0].ruleName)
      : null;

  return NextResponse.json({
    summary: {
      totalSignals: rows.length,
      negativeCount: totalNeg,
      negativeChange: pctChange(totalNeg, prevNeg),
      positiveCount: totalPos,
      positiveChange: pctChange(totalPos, prevPos),
      alertsCount: activeAlerts.length,
      criticalAlert,
    },
    facebook,
    tiktok,
    threads,
  });
}
