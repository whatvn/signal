import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .update(alerts)
    .set({ acknowledgedAt: now })
    .where(eq(alerts.id, params.id));

  return NextResponse.json({ ok: true });
}
