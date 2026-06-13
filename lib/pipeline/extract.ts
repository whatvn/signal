import { db } from "@/db";
import { comments } from "@/db/schema";
import { socialfetch } from "@/lib/socialfetch/client";
import { RawPost, RawComment } from "@/lib/socialfetch/types";

export interface PostWithComments {
  post: RawPost;
  comments: RawComment[];
}

async function fetchPostWithComments(post: RawPost, now: number): Promise<PostWithComments> {
  const rawComments =
    post.platform === "tiktok"
      ? await socialfetch.getTikTokComments(post.sourceUrl)
      : await socialfetch.getFacebookComments(post.sourceUrl ?? "");

  if (rawComments.length > 0) {
    await db
      .insert(comments)
      .values(
        rawComments.map((c) => ({
          id: `${post.id}_${c.id}`,
          postId: post.id,
          authorHandle: c.authorHandle,
          contentText: c.contentText,
          fetchedAt: now,
        }))
      )
      .onConflictDoNothing();
  }

  return { post, comments: rawComments };
}

export async function extractStage(posts: RawPost[]): Promise<PostWithComments[]> {
  if (posts.length === 0) return [];

  const now = Math.floor(Date.now() / 1000);
  const CONCURRENCY = 3;

  const successful: PostWithComments[] = [];
  for (let i = 0; i < posts.length; i += CONCURRENCY) {
    const chunk = posts.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((post) => fetchPostWithComments(post, now)));
    for (const result of settled) {
      if (result.status === "fulfilled") successful.push(result.value);
    }
  }

  console.log(`[Extract] ${successful.length}/${posts.length} posts extracted`);
  return successful;
}
