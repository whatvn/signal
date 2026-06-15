import { db } from "@/db";
import { comments } from "@/db/schema";
import { socialfetch } from "@/lib/socialfetch/client";
import { RawPost, RawComment } from "@/lib/socialfetch/types";
import { Emit } from "./runner";

export interface PostWithComments {
  post: RawPost;
  comments: RawComment[];
}

async function fetchPostWithComments(post: RawPost, now: number): Promise<PostWithComments> {
  const rawComments =
    post.platform === "tiktok"
      ? await socialfetch.getTikTokComments(post.sourceUrl)
      : post.platform === "facebook"
      ? await socialfetch.getFacebookComments(post.sourceUrl ?? "", post.feedbackId)
      : [];

  if (rawComments.length > 0) {
    try {
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
    } catch (err) {
      console.error(`[Extract] Failed to save comments for ${post.id}:`, err);
    }
  }

  return { post, comments: rawComments };
}

export async function extractStage(posts: RawPost[], emit: Emit): Promise<PostWithComments[]> {
  if (posts.length === 0) return [];

  const now = Math.floor(Date.now() / 1000);
  const CONCURRENCY = 3;
  emit("info", `Extracting comments for ${posts.length} posts (concurrency ${CONCURRENCY})…`);

  const successful: PostWithComments[] = [];
  for (let i = 0; i < posts.length; i += CONCURRENCY) {
    const chunk = posts.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((post) => fetchPostWithComments(post, now)));
    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      const post = chunk[j];
      if (result.status === "fulfilled") {
        successful.push(result.value);
        emit("info", `  [${post.platform}] ${post.id.slice(0, 12)}… → ${result.value.comments.length} comments`);
      } else {
        emit("error", `  [${post.platform}] ${post.id.slice(0, 12)}… failed: ${result.reason}`);
      }
    }
  }

  emit("info", `Done: ${successful.length}/${posts.length} posts extracted`);
  console.log(`[Extract] ${successful.length}/${posts.length} posts extracted`);
  return successful;
}
