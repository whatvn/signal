import { db } from "@/db";
import { classifications, posts } from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUBCATEGORIES = [
  "fraud_scam",
  "fund_loss",
  "app_bugs",
  "transaction_failure",
  "poor_support",
  "feature_gap",
  "promotion_cashback",
  "feature_praise",
  "ux_speed_praise",
  "recommendation",
];

export async function GET() {
  const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

  const rows = await db
    .select({
      publishedAt: posts.publishedAt,
      fetchedAt: posts.fetchedAt,
      subcategory: classifications.subcategory,
    })
    .from(classifications)
    .innerJoin(posts, eq(posts.id, classifications.postId))
    .where(gte(posts.publishedAt, since));

  // Group into hourly buckets by content publish time
  const buckets = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const ts = row.publishedAt ?? row.fetchedAt;
    const hourTs = Math.floor(ts / 3600) * 3600;
    const hourKey = new Date(hourTs * 1000).toISOString();

    if (!buckets.has(hourKey)) {
      const empty: Record<string, number> = { hour: hourTs };
      SUBCATEGORIES.forEach((s) => (empty[s] = 0));
      buckets.set(hourKey, empty);
    }

    const bucket = buckets.get(hourKey)!;
    if (row.subcategory in bucket) {
      bucket[row.subcategory]++;
    }
  }

  const series = Array.from(buckets.values()).sort(
    (a, b) => (a.hour as number) - (b.hour as number)
  );

  return NextResponse.json({ series });
}
