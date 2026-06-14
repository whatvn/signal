import { db } from "@/db";
import { posts, pipelineState } from "@/db/schema";
import { socialfetch } from "@/lib/socialfetch/client";
import { RawPost } from "@/lib/socialfetch/types";
import { eq, inArray } from "drizzle-orm";
import { Emit } from "./runner";

const ZALOPAY_FB_PAGE = "https://www.facebook.com/zalopay";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Keep posts newer than cutoff; null publishedAt is included (safety net via ID dedup)
function filterByCutoff(rawPosts: RawPost[], cutoff: number): RawPost[] {
  return rawPosts.filter((p) => p.publishedAt == null || p.publishedAt >= cutoff);
}

// Returns true if any post in the page is newer than cutoff — worth fetching next page
function hasContentNewerThan(rawPosts: RawPost[], cutoff: number): boolean {
  return rawPosts.some((p) => p.publishedAt == null || p.publishedAt >= cutoff);
}

export async function fetchStage(keyword: string, emit: Emit): Promise<RawPost[]> {
  emit("info", `Keyword: "${keyword}"`);

  // Determine fetch window: last completed run timestamp or 7 days ago for first run
  const [stateRow] = await db.select().from(pipelineState).where(eq(pipelineState.keyword, keyword));
  const lastCompletedAt = stateRow?.lastCompletedAt ?? null;
  const SEVEN_DAYS_AGO = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const cutoff = lastCompletedAt ?? SEVEN_DAYS_AGO;

  if (lastCompletedAt === null) {
    emit("info", `First run — fetching posts since ${toDateStr(new Date(cutoff * 1000))} (last 7 days)`);
  } else {
    emit("info", `Incremental — fetching posts since ${new Date(lastCompletedAt * 1000).toISOString().replace("T", " ").slice(0, 19)}`);
  }

  const threadsStartDate = toDateStr(new Date(cutoff * 1000));
  const threadsEndDate = toDateStr(new Date());

  // Use current timestamp as cursor for TikTok hashtag search (returns newest content first)
  const initialCursor = String(Date.now());

  emit("info", "Fetching TikTok keyword p1 + hashtag p1 + Threads…");
  const [tt1, ht1, th1] = await Promise.allSettled([
    socialfetch.searchTikTok(keyword),
    socialfetch.searchTikTokHashtag(keyword, initialCursor),
    socialfetch.searchThreads(keyword, threadsStartDate, threadsEndDate),
  ]);

  const tt1Result = tt1.status === "fulfilled" ? tt1.value : { posts: [], nextCursor: null };
  const ht1Result = ht1.status === "fulfilled" ? ht1.value : { posts: [], nextCursor: null };
  const th1Result = th1.status === "fulfilled" ? th1.value : { posts: [], nextCursor: null };

  if (tt1.status === "rejected") emit("error", `TikTok keyword p1 failed: ${tt1.reason}`);
  else emit("info", `TikTok keyword p1: ${tt1Result.posts.length} posts`);

  if (ht1.status === "rejected") emit("error", `TikTok hashtag p1 failed: ${ht1.reason}`);
  else emit("info", `TikTok hashtag p1: ${ht1Result.posts.length} posts`);

  if (th1.status === "rejected") emit("error", `Threads search failed: ${th1.reason}`);
  else emit("info", `Threads: ${th1Result.posts.length} posts`);

  // Only fetch page 2 if page 1 had content newer than the cutoff
  const fetchTTp2 = tt1Result.nextCursor && hasContentNewerThan(tt1Result.posts, cutoff);
  const fetchHTp2 = ht1Result.nextCursor && hasContentNewerThan(ht1Result.posts, cutoff);

  emit("info", "Fetching TikTok p2 + Facebook p1…");
  const [tt2, ht2, fb1] = await Promise.allSettled([
    fetchTTp2
      ? socialfetch.searchTikTok(keyword, tt1Result.nextCursor!)
      : Promise.resolve({ posts: [], nextCursor: null }),
    fetchHTp2
      ? socialfetch.searchTikTokHashtag(keyword, ht1Result.nextCursor!)
      : Promise.resolve({ posts: [], nextCursor: null }),
    socialfetch.getFacebookPagePosts(ZALOPAY_FB_PAGE),
  ]);

  const fb1Result = fb1.status === "fulfilled" ? fb1.value : { posts: [], nextCursor: null };

  if (tt2.status === "rejected") emit("warn", `TikTok keyword p2 failed: ${tt2.reason}`);
  else if (tt2.value.posts.length) emit("info", `TikTok keyword p2: ${tt2.value.posts.length} posts`);

  if (ht2.status === "rejected") emit("warn", `TikTok hashtag p2 failed: ${ht2.reason}`);
  else if (ht2.value.posts.length) emit("info", `TikTok hashtag p2: ${ht2.value.posts.length} posts`);

  if (fb1.status === "rejected") emit("error", `Facebook p1 failed: ${fb1.reason}`);
  else emit("info", `Facebook p1: ${fb1Result.posts.length} posts`);

  // Facebook page 2 only if page 1 had recent content
  let fb2 = { posts: [] as RawPost[], nextCursor: null as string | null };
  if (fb1Result.nextCursor && hasContentNewerThan(fb1Result.posts, cutoff)) {
    emit("info", "Fetching Facebook p2…");
    fb2 = await socialfetch
      .getFacebookPagePosts(ZALOPAY_FB_PAGE, fb1Result.nextCursor)
      .catch((err) => {
        emit("warn", `Facebook p2 failed: ${err}`);
        return { posts: [], nextCursor: null };
      });
    if (fb2.posts.length) emit("info", `Facebook p2: ${fb2.posts.length} posts`);
  }

  // Aggregate and apply cutoff filter across all sources
  const allRaw: RawPost[] = filterByCutoff(
    [
      ...tt1Result.posts,
      ...(tt2.status === "fulfilled" ? tt2.value.posts : []),
      ...ht1Result.posts,
      ...(ht2.status === "fulfilled" ? ht2.value.posts : []),
      ...fb1Result.posts,
      ...fb2.posts,
      ...th1Result.posts,
    ].filter((p) => p.id && p.contentText),
    cutoff
  );

  if (allRaw.length === 0) {
    emit("warn", "No posts returned from any source within the fetch window");
    return [];
  }

  emit("info", `Deduplicating ${allRaw.length} raw posts…`);
  const incomingIds = allRaw.map((p) => p.id);
  const existing = await db
    .select({ id: posts.id })
    .from(posts)
    .where(inArray(posts.id, incomingIds));
  const existingIds = new Set(existing.map((r) => r.id));

  const newPosts = allRaw.filter((p) => !existingIds.has(p.id));
  emit("info", `${newPosts.length} new / ${allRaw.length - newPosts.length} already seen / ${allRaw.length} total`);

  const now = Math.floor(Date.now() / 1000);

  if (newPosts.length > 0) {
    await db
      .insert(posts)
      .values(
        newPosts.map((p) => ({
          id: p.id,
          platform: p.platform,
          sourceUrl: p.sourceUrl,
          authorHandle: p.authorHandle,
          contentText: p.contentText,
          rawJson: p.rawJson,
          fetchedAt: now,
          publishedAt: p.publishedAt ?? null,
          keyword,
        }))
      )
      .onConflictDoNothing();

    for (const p of newPosts) {
      const ts = p.publishedAt
        ? new Date(p.publishedAt * 1000).toISOString().replace("T", " ").slice(0, 19)
        : "unknown time";
      emit("info", `  [${p.platform}] ${ts}  ${p.sourceUrl ?? "(no url)"}`);
    }
  }

  // Persist pipeline state so next run knows where to start
  await db
    .insert(pipelineState)
    .values({ keyword, lastCompletedAt: now })
    .onConflictDoUpdate({ target: pipelineState.keyword, set: { lastCompletedAt: now } });

  console.log(
    `[Fetch] ${newPosts.length} new / ${allRaw.length - newPosts.length} deduped / ${allRaw.length} total`
  );
  return newPosts;
}
