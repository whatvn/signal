import { db } from "@/db";
import { posts } from "@/db/schema";
import { socialfetch } from "@/lib/socialfetch/client";
import { RawPost } from "@/lib/socialfetch/types";
import { inArray } from "drizzle-orm";

const ZALOPAY_FB_PAGE = "https://www.facebook.com/zalopay";

export async function fetchStage(keyword: string): Promise<RawPost[]> {
  // Use current timestamp as cursor for hashtag search (returns newest content first)
  const initialCursor = String(Date.now());

  // Fetch TikTok keyword page 1 and hashtag page 1 in parallel
  const [tt1, ht1] = await Promise.allSettled([
    socialfetch.searchTikTok(keyword),
    socialfetch.searchTikTokHashtag(keyword, initialCursor),
  ]);

  const tt1Result = tt1.status === "fulfilled" ? tt1.value : { posts: [], nextCursor: null };
  const ht1Result = ht1.status === "fulfilled" ? ht1.value : { posts: [], nextCursor: null };

  // TikTok page 2 (keyword + hashtag) + Facebook page 1 in parallel
  const [tt2, ht2, fb1] = await Promise.allSettled([
    tt1Result.nextCursor
      ? socialfetch.searchTikTok(keyword, tt1Result.nextCursor)
      : Promise.resolve({ posts: [], nextCursor: null }),
    ht1Result.nextCursor
      ? socialfetch.searchTikTokHashtag(keyword, ht1Result.nextCursor)
      : Promise.resolve({ posts: [], nextCursor: null }),
    socialfetch.getFacebookPagePosts(ZALOPAY_FB_PAGE, initialCursor),
  ]);

  const fb1Result = fb1.status === "fulfilled" ? fb1.value : { posts: [], nextCursor: null };

  // Facebook page 2
  const fb2 = fb1Result.nextCursor
    ? await socialfetch.getFacebookPagePosts(ZALOPAY_FB_PAGE, fb1Result.nextCursor).catch(() => ({ posts: [], nextCursor: null }))
    : { posts: [], nextCursor: null };

  const allRaw: RawPost[] = [
    ...tt1Result.posts,
    ...(tt2.status === "fulfilled" ? tt2.value.posts : []),
    ...ht1Result.posts,
    ...(ht2.status === "fulfilled" ? ht2.value.posts : []),
    ...fb1Result.posts,
    ...fb2.posts,
  ].filter((p) => p.id && p.contentText);

  if (allRaw.length === 0) return [];

  const incomingIds = allRaw.map((p) => p.id);
  const existing = await db
    .select({ id: posts.id })
    .from(posts)
    .where(inArray(posts.id, incomingIds));
  const existingIds = new Set(existing.map((r) => r.id));

  const newPosts = allRaw.filter((p) => !existingIds.has(p.id));

  if (newPosts.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(posts).values(
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
    );
  }

  console.log(
    `[Fetch] ${newPosts.length} new posts (${allRaw.length - newPosts.length} deduped, ${allRaw.length} total fetched)`
  );
  return newPosts;
}
