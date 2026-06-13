import { db } from "@/db";
import { posts, classifications } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const sentiment = searchParams.get("sentiment");
  const subcategory = searchParams.get("subcategory");

  const offset = (page - 1) * limit;

  const conditions = [];
  if (sentiment) conditions.push(eq(classifications.sentiment, sentiment));
  if (subcategory) conditions.push(eq(classifications.subcategory, subcategory));

  const rows = await db
    .select({
      id: posts.id,
      platform: posts.platform,
      sourceUrl: posts.sourceUrl,
      authorHandle: posts.authorHandle,
      contentText: posts.contentText,
      fetchedAt: posts.fetchedAt,
      publishedAt: posts.publishedAt,
      keyword: posts.keyword,
      sentiment: classifications.sentiment,
      subcategory: classifications.subcategory,
      confidence: classifications.confidence,
      commentCount: classifications.commentCount,
      classifiedAt: classifications.classifiedAt,
    })
    .from(posts)
    .innerJoin(classifications, eq(classifications.postId, posts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sql`COALESCE(${posts.publishedAt}, ${posts.fetchedAt})`))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ posts: rows, page, limit });
}
