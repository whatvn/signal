import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(parseProfile(row));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);

  if (body.isDefault) {
    await db.update(profiles).set({ isDefault: 0 }).where(ne(profiles.id, id));
  }

  const [row] = await db
    .update(profiles)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault ? 1 : 0 }),
      ...(body.tiktokKeywords !== undefined && { tiktokKeywords: JSON.stringify(body.tiktokKeywords) }),
      ...(body.tiktokHashtags !== undefined && { tiktokHashtags: JSON.stringify(body.tiktokHashtags) }),
      ...(body.threadsKeywords !== undefined && { threadsKeywords: JSON.stringify(body.threadsKeywords) }),
      ...(body.facebookPageUrls !== undefined && { facebookPageUrls: JSON.stringify(body.facebookPageUrls) }),
      ...(body.appStoreId !== undefined && { appStoreId: body.appStoreId }),
      ...(body.appStoreCountry !== undefined && { appStoreCountry: body.appStoreCountry }),
      ...(body.playStoreId !== undefined && { playStoreId: body.playStoreId }),
      updatedAt: now,
    })
    .where(eq(profiles.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(parseProfile(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);

  const all = await db.select().from(profiles);
  if (all.length <= 1) {
    return NextResponse.json({ error: "cannot delete the last profile" }, { status: 400 });
  }

  const target = all.find((p) => p.id === id);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (target.isDefault === 1) {
    return NextResponse.json({ error: "cannot delete the default profile — set another as default first" }, { status: 400 });
  }

  await db.delete(profiles).where(eq(profiles.id, id));
  return NextResponse.json({ deleted: id });
}
