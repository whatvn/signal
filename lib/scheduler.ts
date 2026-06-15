import cron from "node-cron";
import { runPipeline } from "./pipeline/runner";

let started = false;
let running = false;

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
      console.log("[Scheduler] Firing pipeline run");
      await runPipeline("ZaloPay");
    } finally {
      running = false;
    }
  });

  console.log("[Scheduler] Started — pipeline runs twice a day (08:00 and 20:00)");
}
