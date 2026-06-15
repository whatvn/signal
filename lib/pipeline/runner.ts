import { broadcast } from "@/lib/sse";
import { db } from "@/db";
import { posts, classifications, pipelineState } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { fetchStage } from "./fetch";
import { extractStage } from "./extract";
import { classifyStage } from "./classify";
import { alertStage } from "./alert";
import { RawPost } from "@/lib/socialfetch/types";
import { ProfileConfig } from "@/lib/types";

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

export async function runPipeline(profile: ProfileConfig, platform?: string): Promise<void> {
  console.log(`[Pipeline] Starting run for profile: ${profile.name}${platform ? ` platform: ${platform}` : ""}`);

  try {
    const fetchEmit = makeEmit("fetch");
    emitStage("fetch", "running");
    const newPosts = await fetchStage(profile, fetchEmit, platform);

    // Recover posts inserted in a previous interrupted run but never classified
    const unclassifiedRows = await (platform
      ? db.select().from(posts).where(
          sql`${posts.id} NOT IN (SELECT post_id FROM classifications) AND ${posts.platform} = ${platform} AND ${posts.profileId} = ${profile.id}`
        )
      : db.select().from(posts).where(
          sql`${posts.id} NOT IN (SELECT post_id FROM classifications) AND ${posts.profileId} = ${profile.id}`
        )
    );

    const unclassified: RawPost[] = unclassifiedRows
      .filter((r) => !newPosts.find((p) => p.id === r.id))
      .map((r) => ({
        id: r.id,
        platform: r.platform as RawPost["platform"],
        authorHandle: r.authorHandle ?? "",
        contentText: r.contentText,
        sourceUrl: r.sourceUrl ?? "",
        rawJson: r.rawJson,
        publishedAt: r.publishedAt ?? undefined,
      }));

    if (unclassified.length > 0) {
      fetchEmit("info", `Recovering ${unclassified.length} previously unclassified posts…`);
    }

    const postsToProcess = [...newPosts, ...unclassified];
    emitStage("fetch", "done", { count: postsToProcess.length });

    if (postsToProcess.length === 0) {
      emitStage("extract", "done", { count: 0 });
      emitStage("classify", "done", { count: 0 });
      emitStage("alert", "done");
      console.log("[Pipeline] No new posts, skipping remaining stages");
      return;
    }

    const extractEmit = makeEmit("extract");
    emitStage("extract", "running");
    const postsWithComments = await extractStage(postsToProcess, extractEmit);
    emitStage("extract", "done", { count: postsWithComments.length });

    const classifyEmit = makeEmit("classify");
    emitStage("classify", "running");
    await classifyStage(postsWithComments, classifyEmit, profile.name);
    emitStage("classify", "done", { count: postsWithComments.length });

    const alertEmit = makeEmit("alert");
    emitStage("alert", "running");
    await alertStage(alertEmit);
    emitStage("alert", "done");

    const now = Math.floor(Date.now() / 1000);
    const stateKey = platform ? `p${profile.id}::${platform}` : `p${profile.id}`;
    await db
      .insert(pipelineState)
      .values({ keyword: stateKey, lastCompletedAt: now })
      .onConflictDoUpdate({ target: pipelineState.keyword, set: { lastCompletedAt: now } });

    console.log("[Pipeline] Run complete");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Pipeline] Run failed:", message);
    broadcast({ type: "pipeline_error", message });
  }
}
