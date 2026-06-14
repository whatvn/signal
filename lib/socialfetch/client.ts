import { RawComment, RawPost } from "./types";

const BASE = "https://api.socialfetch.dev";

async function sfetch(
  path: string,
  params: Record<string, string> = {},
  timeoutMs = 15000
): Promise<unknown> {
  const url = new URL(path, BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "x-api-key": process.env.SOCIAL_FETCH_API_KEY ?? "",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`SocialFetch ${res.status} ${path}: ${body}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const socialfetch = {
  async searchTikTok(keyword: string, cursor?: string): Promise<{ posts: RawPost[]; nextCursor: string | null }> {
    try {
      const params: Record<string, string> = { query: keyword, trim: "false" };
      if (cursor) params.cursor = cursor;

      const data = (await sfetch("/v1/tiktok/search", params)) as {
        data: {
          videos: Array<{
            id: string;
            caption: string;
            url: string;
            createdAt?: string;
            details?: { author?: { unique_id?: string; nickname?: string } };
            stats?: Record<string, number>;
          }>;
          page?: { nextCursor: string | null; hasMore: boolean };
        };
      };

      const videos = data?.data?.videos ?? [];
      const posts: RawPost[] = videos.map((v) => {
        const publishedAt = v.createdAt ? Math.floor(new Date(v.createdAt).getTime() / 1000) : undefined;
        return {
          id: `tt_${v.id}`,
          platform: "tiktok" as const,
          authorHandle: v.details?.author?.unique_id ?? v.details?.author?.nickname ?? "",
          contentText: v.caption ?? "",
          sourceUrl: v.url ?? `https://www.tiktok.com/video/${v.id}`,
          rawJson: JSON.stringify(v),
          publishedAt,
        };
      });

      return {
        posts,
        nextCursor: data?.data?.page?.nextCursor ?? null,
      };
    } catch (err) {
      console.error("[SocialFetch] TikTok search failed:", err);
      return { posts: [], nextCursor: null };
    }
  },

  async searchTikTokHashtag(hashtag: string, cursor?: string): Promise<{ posts: RawPost[]; nextCursor: string | null }> {
    try {
      const params: Record<string, string> = { hashtag, region: "VN" };
      if (cursor) params.cursor = cursor;

      const data = (await sfetch("/v1/tiktok/search/hashtags", params, 30000)) as {
        data: {
          videos: Array<{
            id: string;
            caption: string;
            url: string;
            createdAt?: string;
            details?: { author?: { unique_id?: string; nickname?: string } };
            stats?: Record<string, number>;
          }>;
          page?: { nextCursor: string | null; hasMore: boolean };
        };
      };

      const videos = data?.data?.videos ?? [];
      const posts: RawPost[] = videos.map((v) => {
        const publishedAt = v.createdAt ? Math.floor(new Date(v.createdAt).getTime() / 1000) : undefined;
        return {
          id: `tt_${v.id}`,
          platform: "tiktok" as const,
          authorHandle: v.details?.author?.unique_id ?? v.details?.author?.nickname ?? "",
          contentText: v.caption ?? "",
          sourceUrl: v.url ?? `https://www.tiktok.com/video/${v.id}`,
          rawJson: JSON.stringify(v),
          publishedAt,
        };
      });

      return {
        posts,
        nextCursor: data?.data?.page?.nextCursor ?? null,
      };
    } catch (err) {
      console.error("[SocialFetch] TikTok hashtag search failed:", err);
      return { posts: [], nextCursor: null };
    }
  },

  async getFacebookPagePosts(pageUrl: string, cursor?: string): Promise<{ posts: RawPost[]; nextCursor: string | null }> {
    try {
      const params: Record<string, string> = { url: pageUrl };
      if (cursor) params.cursor = cursor;

      const data = (await sfetch(
        "/v1/facebook/profiles/posts",
        params,
        25000
      )) as {
        data: {
          posts: Array<{
            id?: string;
            feedbackId?: string;
            message?: string;
            text?: string;
            url?: string;
            author?: { name?: string };
            publishTime?: number;
          }>;
          page?: { nextCursor: string | null; hasMore: boolean };
        };
      };

      const posts_raw = data?.data?.posts ?? [];
      const posts = posts_raw
        .filter((p) => p.message ?? p.text)
        .map((p) => {
          const postId = p.feedbackId ?? p.id ?? String(Math.random());
          return {
            id: `fb_${postId}`,
            platform: "facebook" as const,
            authorHandle: p.author?.name ?? "",
            contentText: p.message ?? p.text ?? "",
            sourceUrl: p.url ?? `https://www.facebook.com/${postId}`,
            rawJson: JSON.stringify(p),
            publishedAt: p.publishTime ?? undefined,
            feedbackId: p.feedbackId,
          };
        });

      return { posts, nextCursor: data?.data?.page?.nextCursor ?? null };
    } catch (err) {
      console.error("[SocialFetch] Facebook page posts failed:", err);
      return { posts: [], nextCursor: null };
    }
  },

  async getTikTokComments(videoUrl: string): Promise<RawComment[]> {
    try {
      const data = (await sfetch("/v1/tiktok/videos/comments", { url: videoUrl })) as {
        data: {
          comments: Array<{
            id: string;
            text: string;
            author?: { handle?: string; displayName?: string };
          }>;
        };
      };

      const comments = data?.data?.comments ?? [];
      return comments.map((c) => ({
        id: c.id,
        authorHandle: c.author?.handle ?? c.author?.displayName ?? "",
        contentText: c.text ?? "",
      }));
    } catch (err) {
      console.error(`[SocialFetch] TikTok comments failed for ${videoUrl}:`, err);
      return [];
    }
  },

  async searchThreads(
    keyword: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ posts: RawPost[]; nextCursor: string | null }> {
    try {
      const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const params: Record<string, string> = {
        query: keyword,
        startDate: startDate ?? toDateStr(twoDaysAgo),
        endDate: endDate ?? toDateStr(now),
      };

      const data = (await sfetch("/v1/threads/search", params, 20000)) as {
        data?: {
          posts?: Array<{
            id?: string;
            text?: string;
            url?: string;
            createdAt?: number;
            author?: { handle?: string; displayName?: string };
          }>;
          page?: { nextCursor: string | null; hasMore: boolean };
        };
      };

      const items = data?.data?.posts ?? [];
      const posts: RawPost[] = items
        .filter((t) => t.text)
        .map((t) => {
          const postId = t.id ?? String(Math.random());
          const handle = t.author?.handle ?? t.author?.displayName ?? "";
          return {
            id: `th_${postId}`,
            platform: "threads" as const,
            authorHandle: handle,
            contentText: t.text ?? "",
            sourceUrl: t.url ?? `https://www.threads.net/@${handle}/post/${postId}`,
            rawJson: JSON.stringify(t),
            publishedAt: t.createdAt ?? undefined,
          };
        });

      return { posts, nextCursor: data?.data?.page?.nextCursor ?? null };
    } catch (err) {
      console.error("[SocialFetch] Threads search failed:", err);
      return { posts: [], nextCursor: null };
    }
  },

  async getFacebookComments(postUrl: string, feedbackId?: string): Promise<RawComment[]> {
    try {
      const params: Record<string, string> = { url: postUrl };
      if (feedbackId) params.feedbackId = feedbackId;

      const data = (await sfetch(
        "/v1/facebook/posts/comments",
        params,
        25000
      )) as {
        data: {
          lookupStatus?: string;
          comments: Array<{
            id: string;
            text?: string;
            author?: { name?: string };
          }>;
        };
      };

      if (data?.data?.lookupStatus === "not_found") return [];

      const comments = data?.data?.comments ?? [];
      return comments.map((c) => ({
        id: c.id,
        authorHandle: c.author?.name ?? "",
        contentText: c.text ?? "",
      }));
    } catch (err) {
      console.error(`[SocialFetch] Facebook comments failed for ${postUrl}:`, err);
      return [];
    }
  },
};
