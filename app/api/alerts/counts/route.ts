import { db } from "@/db";
import { classifications, posts } from "@/db/schema";
import { eq, gte, and, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALERT_RULES = [
  { name: "fraud_spike_1h", label: "Fraud / Scam", subcategory: "fraud_scam", threshold: 10, windowMinutes: 60 },
  { name: "fund_loss_spike_1h", label: "Fund Loss", subcategory: "fund_loss", threshold: 5, windowMinutes: 60 },
  { name: "crash_spike_2h", label: "App Crashes", subcategory: "app_bugs", threshold: 15, windowMinutes: 120 },
];

export async function GET() {
  const now = Math.floor(Date.now() / 1000);

  const results = await Promise.all(
    ALERT_RULES.map(async (rule) => {
      const windowStart = now - rule.windowMinutes * 60;
      const [{ value: current }] = await db
        .select({ value: count() })
        .from(classifications)
        .innerJoin(posts, eq(posts.id, classifications.postId))
        .where(
          and(
            eq(classifications.subcategory, rule.subcategory),
            gte(classifications.classifiedAt, windowStart)
          )
        );

      return {
        name: rule.name,
        label: rule.label,
        subcategory: rule.subcategory,
        threshold: rule.threshold,
        windowMinutes: rule.windowMinutes,
        current,
      };
    })
  );

  return NextResponse.json({ counts: results });
}
