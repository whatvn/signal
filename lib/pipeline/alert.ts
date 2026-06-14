import { db } from "@/db";
import { classifications, alerts, posts } from "@/db/schema";
import { broadcast } from "@/lib/sse";
import { Emit } from "./runner";
import { eq, gte, and, isNull, count } from "drizzle-orm";
import { ulid } from "ulid";

interface AlertRule {
  name: string;
  subcategory: string;
  threshold: number;
  windowMinutes: number;
}

const ALERT_RULES: AlertRule[] = [
  { name: "fraud_spike_1h", subcategory: "fraud_scam", threshold: 10, windowMinutes: 60 },
  { name: "fund_loss_spike_1h", subcategory: "fund_loss", threshold: 5, windowMinutes: 60 },
  { name: "crash_spike_2h", subcategory: "app_bugs", threshold: 15, windowMinutes: 120 },
];

export async function alertStage(emit: Emit): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  emit("info", `Checking ${ALERT_RULES.length} alert rules…`);

  for (const rule of ALERT_RULES) {
    const windowStart = now - rule.windowMinutes * 60;
    emit("info", `  Rule "${rule.name}": checking last ${rule.windowMinutes}min for ${rule.subcategory}…`);

    const [{ value: matchCount }] = await db
      .select({ value: count() })
      .from(classifications)
      .innerJoin(posts, eq(posts.id, classifications.postId))
      .where(
        and(
          eq(classifications.subcategory, rule.subcategory),
          gte(classifications.classifiedAt, windowStart)
        )
      );

    if (matchCount < rule.threshold) {
      emit("info", `  Rule "${rule.name}": ${matchCount} < threshold ${rule.threshold} — ok`);
      continue;
    }

    const existing = await db
      .select({ id: alerts.id })
      .from(alerts)
      .where(
        and(
          eq(alerts.ruleName, rule.name),
          isNull(alerts.acknowledgedAt),
          gte(alerts.firedAt, windowStart)
        )
      )
      .get();

    if (existing) {
      emit("warn", `  Rule "${rule.name}": ${matchCount} matches — alert already active, skipping`);
      continue;
    }

    const sampleRows = await db
      .select({ id: posts.id })
      .from(posts)
      .innerJoin(classifications, eq(classifications.postId, posts.id))
      .where(
        and(
          eq(classifications.subcategory, rule.subcategory),
          gte(classifications.classifiedAt, windowStart)
        )
      )
      .limit(5);

    const alertRow = {
      id: ulid(),
      ruleName: rule.name,
      subcategory: rule.subcategory,
      count: matchCount,
      windowMinutes: rule.windowMinutes,
      threshold: rule.threshold,
      firedAt: now,
      acknowledgedAt: null,
      samplePostIds: JSON.stringify(sampleRows.map((r) => r.id)),
    };

    await db.insert(alerts).values(alertRow);
    broadcast({ type: "new_alert", alert: alertRow });
    emit("warn", `  ALERT FIRED: "${rule.name}" — ${matchCount} matches (threshold ${rule.threshold})`);
    console.log(`[Alert] Fired: ${rule.name} (${matchCount} matches)`);
  }
}
