import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROFILE_SETTINGS_LOCKED = true;

function lockedResponse() {
  return NextResponse.json({ error: "profile settings changes are temporarily disabled" }, { status: 403 });
}

function parseProfile(row: typeof profiles.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault === 1,
    tiktokKeywords: JSON.parse(row.tiktokKeywords) as string[],
    tiktokHashtags: JSON.parse(row.tiktokHashtags) as string[],
    threadsKeywords: JSON.parse(row.threadsKeywords) as string[],
    facebookPageUrls: JSON.parse(row.facebookPageUrls) as string[],
    appStoreId: row.appStoreId,
    appStoreCountry: row.appStoreCountry,
    playStoreId: row.playStoreId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET() {
  const rows = await db.select().from(profiles);
  return NextResponse.json(rows.map(parseProfile));
}

export async function POST(req: NextRequest) {
  if (PROFILE_SETTINGS_LOCKED) return lockedResponse();

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);

  if (body.isDefault) {
    await db.update(profiles).set({ isDefault: 0 });
  }

  const [row] = await db
    .insert(profiles)
    .values({
      name: body.name,
      isDefault: body.isDefault ? 1 : 0,
      tiktokKeywords: JSON.stringify(body.tiktokKeywords ?? []),
      tiktokHashtags: JSON.stringify(body.tiktokHashtags ?? []),
      threadsKeywords: JSON.stringify(body.threadsKeywords ?? []),
      facebookPageUrls: JSON.stringify(body.facebookPageUrls ?? []),
      appStoreId: body.appStoreId ?? null,
      appStoreCountry: body.appStoreCountry ?? "vn",
      playStoreId: body.playStoreId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(parseProfile(row), { status: 201 });
}
