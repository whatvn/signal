import { broadcast } from "@/lib/sse";
import { fetchStage } from "./fetch";
import { extractStage } from "./extract";
import { classifyStage } from "./classify";
import { alertStage } from "./alert";

type StageStatus = "idle" | "running" | "done" | "error";
export type LogLevel = "info" | "warn" | "error";
export type Emit = (level: LogLevel, message: string) => void;

function emitStage(stage: string, status: StageStatus, meta?: Record<string, unknown>) {
  broadcast({ type: "pipeline_stage", stage, status, ...meta });
}

function makeEmit(stage: string): Emit {
  return (level, message) => {
    broadcast({ type: "pipeline_log", stage, level, message, ts: Date.now() });
  };
}

export async function runPipeline(keyword = "ZaloPay"): Promise<void> {
  console.log(`[Pipeline] Starting run for keyword: ${keyword}`);

  try {
    const fetchEmit = makeEmit("fetch");
    emitStage("fetch", "running");
    const newPosts = await fetchStage(keyword, fetchEmit);
    emitStage("fetch", "done", { count: newPosts.length });

    if (newPosts.length === 0) {
      emitStage("extract", "done", { count: 0 });
      emitStage("classify", "done", { count: 0 });
      emitStage("alert", "done");
      console.log("[Pipeline] No new posts, skipping remaining stages");
      return;
    }

    const extractEmit = makeEmit("extract");
    emitStage("extract", "running");
    const postsWithComments = await extractStage(newPosts, extractEmit);
    emitStage("extract", "done", { count: postsWithComments.length });

    const classifyEmit = makeEmit("classify");
    emitStage("classify", "running");
    await classifyStage(postsWithComments, classifyEmit);
    emitStage("classify", "done", { count: postsWithComments.length });

    const alertEmit = makeEmit("alert");
    emitStage("alert", "running");
    await alertStage(alertEmit);
    emitStage("alert", "done");

    console.log("[Pipeline] Run complete");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Pipeline] Run failed:", message);
    broadcast({ type: "pipeline_error", message });
  }
}
