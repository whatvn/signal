import cron from "node-cron";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { runPipeline } from "./pipeline/runner";
import { ProfileConfig } from "./types";

let started = false;
let running = false;

function parseProfile(row: typeof profiles.$inferSelect): ProfileConfig {
  return {
    id: row.id,
    name: row.name,
    tiktokKeywords: JSON.parse(row.tiktokKeywords) as string[],
    tiktokHashtags: JSON.parse(row.tiktokHashtags) as string[],
    threadsKeywords: JSON.parse(row.threadsKeywords) as string[],
    facebookPageUrls: JSON.parse(row.facebookPageUrls) as string[],
    appStoreId: row.appStoreId,
    appStoreCountry: row.appStoreCountry,
    playStoreId: row.playStoreId,
  };
}

export function startScheduler() {
  if (started) return;
  started = true;

  cron.schedule("0 8,20 * * *", async () => {
    if (running) {
      console.log("[Scheduler] Pipeline already running — skipping this tick");
      return;
    }
    running = true;
    try {
      const rows = await db.select().from(profiles);
      console.log(`[Scheduler] Firing pipeline run for ${rows.length} profile(s)`);
      for (const row of rows) {
        await runPipeline(parseProfile(row));
      }
    } finally {
      running = false;
    }
  });

  console.log("[Scheduler] Started — pipeline runs twice a day (08:00 and 20:00)");
}
