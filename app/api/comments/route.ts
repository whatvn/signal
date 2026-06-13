import { db } from "@/db";
import { comments, posts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorHandle: comments.authorHandle,
      contentText: comments.contentText,
      fetchedAt: comments.fetchedAt,
      platform: posts.platform,
      postUrl: posts.sourceUrl,
    })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .orderBy(desc(comments.fetchedAt))
    .limit(limit);

  return NextResponse.json({ comments: rows });
}
