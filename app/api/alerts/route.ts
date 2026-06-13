import { db } from "@/db";
import { alerts } from "@/db/schema";
import { isNull, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(alerts)
    .where(isNull(alerts.acknowledgedAt))
    .orderBy(desc(alerts.firedAt));

  return NextResponse.json({ alerts: rows });
}
