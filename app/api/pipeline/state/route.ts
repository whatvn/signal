import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineState, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const profileIdParam = req.nextUrl.searchParams.get("profileId");

  let profileId: number;
  if (profileIdParam) {
    profileId = parseInt(profileIdParam, 10);
  } else {
    const [def] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.isDefault, 1)).limit(1);
    profileId = def?.id ?? 1;
  }

  const stateKey = `p${profileId}`;
  const [row] = await db.select().from(pipelineState).where(eq(pipelineState.keyword, stateKey));
  return NextResponse.json({ lastCompletedAt: row?.lastCompletedAt ?? null });
}
