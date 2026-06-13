import { broadcast } from "@/lib/sse";
import { fetchStage } from "./fetch";
import { extractStage } from "./extract";
import { classifyStage } from "./classify";
import { alertStage } from "./alert";

type StageStatus = "idle" | "running" | "done" | "error";

function emitStage(stage: string, status: StageStatus, meta?: Record<string, unknown>) {
  broadcast({ type: "pipeline_stage", stage, status, ...meta });
}

export async function runPipeline(keyword = "ZaloPay"): Promise<void> {
  console.log(`[Pipeline] Starting run for keyword: ${keyword}`);

  try {
    emitStage("fetch", "running");
    const newPosts = await fetchStage(keyword);
    emitStage("fetch", "done", { count: newPosts.length });

    if (newPosts.length === 0) {
      emitStage("extract", "done", { count: 0 });
      emitStage("classify", "done", { count: 0 });
      emitStage("alert", "done");
      console.log("[Pipeline] No new posts, skipping remaining stages");
      return;
    }

    emitStage("extract", "running");
    const postsWithComments = await extractStage(newPosts);
    emitStage("extract", "done", { count: postsWithComments.length });

    emitStage("classify", "running");
    await classifyStage(postsWithComments);
    emitStage("classify", "done", { count: postsWithComments.length });

    emitStage("alert", "running");
    await alertStage();
    emitStage("alert", "done");

    console.log("[Pipeline] Run complete");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Pipeline] Run failed:", message);
    broadcast({ type: "pipeline_error", message });
  }
}
