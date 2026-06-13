import cron from "node-cron";
import { runPipeline } from "./pipeline/runner";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  cron.schedule("0 8,20 * * *", async () => {
    console.log("[Scheduler] Firing pipeline run");
    await runPipeline("ZaloPay");
  });

  console.log("[Scheduler] Started — pipeline runs twice a day (08:00 and 20:00)");
}
