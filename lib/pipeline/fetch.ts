import { db } from "@/db";
import { posts, pipelineState } from "@/db/schema";
import { socialfetch } from "@/lib/socialfetch/client";
import { fetchAppleReviews, fetchPlayStoreReviews } from "@/lib/socialfetch/appreviews";
import { RawPost } from "@/lib/socialfetch/types";
import { ProfileConfig } from "@/lib/types";
import { eq, inArray } from "drizzle-orm";
import { Emit } from "./runner";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function filterByCutoff(rawPosts: RawPost[], cutoff: number): RawPost[] {
  return rawPosts.filter((p) => p.publishedAt == null || p.publishedAt >= cutoff);
}

function hasKnownContentNewerThan(rawPosts: RawPost[], cutoff: number): boolean {
  return rawPosts.some((p) => p.publishedAt != null && p.publishedAt >= cutoff);
}

function hasContentNewerThan(rawPosts: RawPost[], cutoff: number): boolean {
  return rawPosts.some((p) => p.publishedAt == null || p.publishedAt >= cutoff);
}

async function fetchTikTokKeywordAllPages(keyword: string, cutoff: number, emit: Emit): Promise<RawPost[]> {
  const all: RawPost[] = [];
  const p1 = await socialfetch.searchTikTok(keyword).catch((err) => {
    emit("error", `TikTok keyword "${keyword}" p1 failed: ${err}`);
    return { posts: [] as RawPost[], nextCursor: null as string | null };
  });
  all.push(...p1.posts);
  emit("info", `TikTok keyword "${keyword}" p1: ${p1.posts.length} posts`);

  let cursor = p1.nextCursor;
  let page = 2;
  while (cursor && hasKnownContentNewerThan(all, cutoff) && page <= 7) {
    emit("info", `Fetching TikTok keyword "${keyword}" p${page}…`);
    const next = await socialfetch.searchTikTok(keyword, cursor).catch((err) => {
      emit("warn", `TikTok keyword "${keyword}" p${page} failed: ${err}`);
      return { posts: [] as RawPost[], nextCursor: null as string | null };
    });
    if (next.posts.length) emit("info", `TikTok keyword "${keyword}" p${page}: ${next.posts.length} posts`);
    all.push(...next.posts);
    cursor = next.nextCursor;
    page++;
  }
  // TikTok: drop posts with no createdAt
  return all.filter((p) => p.publishedAt != null);
}

async function fetchTikTokHashtagAllPages(hashtag: string, cutoff: number, emit: Emit): Promise<RawPost[]> {
  const all: RawPost[] = [];
  const p1 = await socialfetch.searchTikTokHashtag(hashtag).catch((err) => {
    emit("error", `TikTok hashtag "${hashtag}" p1 failed: ${err}`);
    return { posts: [] as RawPost[], nextCursor: null as string | null };
  });
  all.push(...p1.posts);
  emit("info", `TikTok hashtag "${hashtag}" p1: ${p1.posts.length} posts`);

  let cursor = p1.nextCursor;
  let page = 2;
  while (cursor && hasKnownContentNewerThan(all, cutoff) && page <= 7) {
    emit("info", `Fetching TikTok hashtag "${hashtag}" p${page}…`);
    const next = await socialfetch.searchTikTokHashtag(hashtag, cursor).catch((err) => {
      emit("warn", `TikTok hashtag "${hashtag}" p${page} failed: ${err}`);
      return { posts: [] as RawPost[], nextCursor: null as string | null };
    });
    if (next.posts.length) emit("info", `TikTok hashtag "${hashtag}" p${page}: ${next.posts.length} posts`);
    all.push(...next.posts);
    cursor = next.nextCursor;
    page++;
  }
  return all.filter((p) => p.publishedAt != null);
}

async function fetchFacebookPageAllPages(pageUrl: string, cutoff: number, emit: Emit): Promise<RawPost[]> {
  const all: RawPost[] = [];
  const p1 = await socialfetch.getFacebookPagePosts(pageUrl).catch((err) => {
    emit("error", `Facebook "${pageUrl}" p1 failed: ${err}`);
    return { posts: [] as RawPost[], nextCursor: null as string | null };
  });
  all.push(...p1.posts);
  emit("info", `Facebook "${pageUrl}" p1: ${p1.posts.length} posts`);

  let cursor = p1.nextCursor;
  let page = 2;
  while (cursor && hasContentNewerThan(all, cutoff) && page <= 7) {
    emit("info", `Fetching Facebook "${pageUrl}" p${page}…`);
    const next = await socialfetch.getFacebookPagePosts(pageUrl, cursor).catch((err) => {
      emit("warn", `Facebook "${pageUrl}" p${page} failed: ${err}`);
      return { posts: [] as RawPost[], nextCursor: null as string | null };
    });
    if (next.posts.length) emit("info", `Facebook "${pageUrl}" p${page}: ${next.posts.length} posts`);
    all.push(...next.posts);
    cursor = next.nextCursor;
    page++;
  }
  return all;
}

export async function fetchStage(
  profile: ProfileConfig,
  emit: Emit,
  platform?: string
): Promise<RawPost[]> {
  emit("info", `Profile: "${profile.name}"${platform ? ` · platform: ${platform}` : ""}`);

  const stateKey = platform ? `p${profile.id}::${platform}` : `p${profile.id}`;
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
  const shouldFetch = (p: string) => !platform || platform === p;

  const sources: string[] = [];
  if (shouldFetch("tiktok") && (profile.tiktokKeywords.length > 0 || profile.tiktokHashtags.length > 0)) sources.push("TikTok");
  if (shouldFetch("threads") && profile.threadsKeywords.length > 0) sources.push("Threads");
  if (shouldFetch("facebook") && profile.facebookPageUrls.length > 0) sources.push("Facebook");
  if (shouldFetch("appstore") && profile.appStoreId) sources.push("App Store");
  if (shouldFetch("playstore") && profile.playStoreId) sources.push("Play Store");
  if (sources.length > 0) emit("info", `Fetching: ${sources.join(" + ")} …`);

  const [ttKwFlat, ttHtFlat, thFlat, fbFlat, asFlat, gpFlat] = await Promise.all([
    !shouldFetch("tiktok") || profile.tiktokKeywords.length === 0
      ? Promise.resolve<RawPost[]>([])
      : Promise.all(profile.tiktokKeywords.map((kw) => fetchTikTokKeywordAllPages(kw, cutoff, emit))).then((r) => r.flat()),

    !shouldFetch("tiktok") || profile.tiktokHashtags.length === 0
      ? Promise.resolve<RawPost[]>([])
      : Promise.all(profile.tiktokHashtags.map((ht) => fetchTikTokHashtagAllPages(ht, cutoff, emit))).then((r) => r.flat()),

    !shouldFetch("threads") || profile.threadsKeywords.length === 0
      ? Promise.resolve<RawPost[]>([])
      : Promise.all(
          profile.threadsKeywords.map(async (kw) => {
            const result = await socialfetch
              .searchThreads(kw, threadsStartDate, threadsEndDate)
              .catch((err) => {
                emit("error", `Threads "${kw}" failed: ${err}`);
                return { posts: [] as RawPost[], nextCursor: null };
              });
            emit("info", `Threads "${kw}": ${result.posts.length} posts`);
            return result.posts;
          })
        ).then((r) => r.flat()),

    !shouldFetch("facebook") || profile.facebookPageUrls.length === 0
      ? Promise.resolve<RawPost[]>([])
      : Promise.all(profile.facebookPageUrls.map((url) => fetchFacebookPageAllPages(url, cutoff, emit))).then((r) => r.flat()),

    !shouldFetch("appstore") || !profile.appStoreId
      ? Promise.resolve<RawPost[]>([])
      : fetchAppleReviews(cutoff, profile.appStoreId, profile.appStoreCountry).catch((err) => {
          emit("error", `Apple App Store failed: ${err}`);
          return [] as RawPost[];
        }),

    !shouldFetch("playstore") || !profile.playStoreId
      ? Promise.resolve<RawPost[]>([])
      : fetchPlayStoreReviews(cutoff, profile.playStoreId).catch((err) => {
          emit("error", `Google Play Store failed: ${err}`);
          return [] as RawPost[];
        }),
  ]);

  const allRaw: RawPost[] = filterByCutoff(
    [...ttKwFlat, ...ttHtFlat, ...thFlat, ...fbFlat, ...asFlat, ...gpFlat].filter(
      (p) => p.id && p.contentText
    ),
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
  // Use first keyword as the stored keyword label; fall back to profile name
  const keywordLabel =
    profile.tiktokKeywords[0] ?? profile.tiktokHashtags[0] ?? profile.threadsKeywords[0] ?? profile.name;

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
          keyword: keywordLabel,
          profileId: profile.id,
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

  console.log(`[Fetch] ${newPosts.length} new / ${allRaw.length - newPosts.length} deduped / ${allRaw.length} total`);
  return newPosts;
}
