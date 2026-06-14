import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineState } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") ?? "ZaloPay";
  const [row] = await db.select().from(pipelineState).where(eq(pipelineState.keyword, keyword));
  return NextResponse.json({ lastCompletedAt: row?.lastCompletedAt ?? null });
}
