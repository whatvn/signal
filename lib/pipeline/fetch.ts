import { db } from "@/db";
import { posts, pipelineState } from "@/db/schema";
import { socialfetch } from "@/lib/socialfetch/client";
import { fetchAppleReviews, fetchPlayStoreReviews } from "@/lib/socialfetch/appreviews";
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

// Returns true if any post with a known date is newer than cutoff — used for TikTok (drops no-createdAt posts)
function hasKnownContentNewerThan(rawPosts: RawPost[], cutoff: number): boolean {
  return rawPosts.some((p) => p.publishedAt != null && p.publishedAt >= cutoff);
}

// Returns true if any post in the page is newer than cutoff — worth fetching next page
function hasContentNewerThan(rawPosts: RawPost[], cutoff: number): boolean {
  return rawPosts.some((p) => p.publishedAt == null || p.publishedAt >= cutoff);
}

export async function fetchStage(keyword: string, emit: Emit, platform?: string): Promise<RawPost[]> {
  emit("info", `Keyword: "${keyword}"${platform ? ` · platform: ${platform}` : ""}`);

  // Per-platform runs use their own state key so they don't share the global cutoff
  const stateKey = platform ? `${keyword}::${platform}` : keyword;
  const [stateRow] = await db.select().from(pipelineState).where(eq(pipelineState.keyword, stateKey));
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

  const only = platform; // undefined means fetch all

  const shouldFetch = (p: string) => !only || only === p;

  // --- TikTok ---
  let tt1Result = { posts: [] as RawPost[], nextCursor: null as string | null };
  let ht1Result = { posts: [] as RawPost[], nextCursor: null as string | null };
  // --- Threads ---
  let th1Result = { posts: [] as RawPost[], nextCursor: null as string | null };
  // --- Facebook ---
  let fb1Result = { posts: [] as RawPost[], nextCursor: null as string | null };
  // --- App stores ---
  let asReviews: RawPost[] = [];
  let gpReviews: RawPost[] = [];

  const sources: string[] = [];
  if (shouldFetch("tiktok")) sources.push("TikTok");
  if (shouldFetch("threads")) sources.push("Threads");
  if (shouldFetch("facebook")) sources.push("Facebook");
  if (shouldFetch("appstore")) sources.push("App Store");
  if (shouldFetch("playstore")) sources.push("Play Store");
  emit("info", `Fetching: ${sources.join(" + ")} p1…`);

  const tasks = await Promise.allSettled([
    shouldFetch("tiktok") ? socialfetch.searchTikTok(keyword) : null,
    shouldFetch("tiktok") ? socialfetch.searchTikTokHashtag(keyword) : null,
    shouldFetch("threads") ? socialfetch.searchThreads(keyword, threadsStartDate, threadsEndDate) : null,
    shouldFetch("facebook") ? socialfetch.getFacebookPagePosts(ZALOPAY_FB_PAGE) : null,
    shouldFetch("appstore") ? fetchAppleReviews(cutoff) : null,
    shouldFetch("playstore") ? fetchPlayStoreReviews(cutoff) : null,
  ]);

  const [r_tt1, r_ht1, r_th1, r_fb1, r_as1, r_gp1] = tasks;

  if (shouldFetch("tiktok")) {
    if (r_tt1.status === "rejected") emit("error", `TikTok keyword p1 failed: ${r_tt1.reason}`);
    else if (r_tt1.value) { tt1Result = r_tt1.value; emit("info", `TikTok keyword p1: ${tt1Result.posts.length} posts`); }

    if (r_ht1.status === "rejected") emit("error", `TikTok hashtag p1 failed: ${r_ht1.reason}`);
    else if (r_ht1.value) { ht1Result = r_ht1.value; emit("info", `TikTok hashtag p1: ${ht1Result.posts.length} posts`); }
  }
  if (shouldFetch("threads")) {
    if (r_th1.status === "rejected") emit("error", `Threads search failed: ${r_th1.reason}`);
    else if (r_th1.value) { th1Result = r_th1.value; emit("info", `Threads: ${th1Result.posts.length} posts`); }
  }
  if (shouldFetch("facebook")) {
    if (r_fb1.status === "rejected") emit("error", `Facebook p1 failed: ${r_fb1.reason}`);
    else if (r_fb1.value) { fb1Result = r_fb1.value; emit("info", `Facebook p1: ${fb1Result.posts.length} posts`); }
  }
  if (shouldFetch("appstore")) {
    if (r_as1.status === "rejected") emit("error", `Apple App Store failed: ${r_as1.reason}`);
    else if (r_as1.value) { asReviews = r_as1.value as RawPost[]; emit("info", `Apple App Store: ${asReviews.length} reviews`); }
  }
  if (shouldFetch("playstore")) {
    if (r_gp1.status === "rejected") emit("error", `Google Play Store failed: ${r_gp1.reason}`);
    else if (r_gp1.value) { gpReviews = r_gp1.value as RawPost[]; emit("info", `Google Play Store: ${gpReviews.length} reviews`); }
  }

  // TikTok keyword pages 2–7 sequentially; skip posts with no createdAt
  const ttKeywordExtra: RawPost[] = [];
  if (shouldFetch("tiktok")) {
    let ttCursor = tt1Result.nextCursor;
    let ttPage = 2;
    while (ttCursor && hasKnownContentNewerThan([...tt1Result.posts, ...ttKeywordExtra], cutoff) && ttPage <= 7) {
      emit("info", `Fetching TikTok keyword p${ttPage}…`);
      const ttNext = await socialfetch
        .searchTikTok(keyword, ttCursor)
        .catch((err) => {
          emit("warn", `TikTok keyword p${ttPage} failed: ${err}`);
          return { posts: [] as RawPost[], nextCursor: null as string | null };
        });
      if (ttNext.posts.length) emit("info", `TikTok keyword p${ttPage}: ${ttNext.posts.length} posts`);
      ttKeywordExtra.push(...ttNext.posts);
      ttCursor = ttNext.nextCursor;
      ttPage++;
    }
  }

  // TikTok hashtag pages 2–7 sequentially; skip posts with no createdAt
  const ttHashtagExtra: RawPost[] = [];
  if (shouldFetch("tiktok")) {
    let htCursor = ht1Result.nextCursor;
    let htPage = 2;
    while (htCursor && hasKnownContentNewerThan([...ht1Result.posts, ...ttHashtagExtra], cutoff) && htPage <= 7) {
      emit("info", `Fetching TikTok hashtag p${htPage}…`);
      const htNext = await socialfetch
        .searchTikTokHashtag(keyword, htCursor)
        .catch((err) => {
          emit("warn", `TikTok hashtag p${htPage} failed: ${err}`);
          return { posts: [] as RawPost[], nextCursor: null as string | null };
        });
      if (htNext.posts.length) emit("info", `TikTok hashtag p${htPage}: ${htNext.posts.length} posts`);
      ttHashtagExtra.push(...htNext.posts);
      htCursor = htNext.nextCursor;
      htPage++;
    }
  }

  // Facebook pages 2–7
  const fbExtraPosts: RawPost[] = [];
  if (shouldFetch("facebook")) {
    let fbCursor = fb1Result.nextCursor;
    let fbPage = 2;
    while (fbCursor && hasContentNewerThan(fb1Result.posts.concat(fbExtraPosts), cutoff) && fbPage <= 7) {
      emit("info", `Fetching Facebook p${fbPage}…`);
      const fbNext = await socialfetch
        .getFacebookPagePosts(ZALOPAY_FB_PAGE, fbCursor)
        .catch((err) => {
          emit("warn", `Facebook p${fbPage} failed: ${err}`);
          return { posts: [] as RawPost[], nextCursor: null as string | null };
        });
      if (fbNext.posts.length) emit("info", `Facebook p${fbPage}: ${fbNext.posts.length} posts`);
      fbExtraPosts.push(...fbNext.posts);
      fbCursor = fbNext.nextCursor;
      fbPage++;
    }
  }

  // TikTok: drop posts with no createdAt before aggregation
  const ttAllPosts = [...tt1Result.posts, ...ttKeywordExtra, ...ht1Result.posts, ...ttHashtagExtra]
    .filter((p) => p.publishedAt != null);

  // Aggregate and apply cutoff filter across all sources
  const allRaw: RawPost[] = filterByCutoff(
    [
      ...ttAllPosts,
      ...fb1Result.posts,
      ...fbExtraPosts,
      ...th1Result.posts,
      ...asReviews,
      ...gpReviews,
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

  console.log(
    `[Fetch] ${newPosts.length} new / ${allRaw.length - newPosts.length} deduped / ${allRaw.length} total`
  );
  return newPosts;
}
