import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/pipeline/runner";
import { ProfileConfig } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

function parseProfile(row: typeof profiles.$inferSelect): ProfileConfig {
  return {
    id: row.id,
    name: row.name,
    tiktokKeywords: JSON.parse(row.tiktokKeywords) as string[],
    tiktokHashtags: JSON.parse(row.tiktokHashtags) as string[],
    threadsKeywords: JSON.parse(row.threadsKeywords) as string[],
    facebookPageUrls: JSON.parse(row.facebookPageUrls) as string[],
    appStoreId: row.appStoreId,
    appStoreCountry: row.appStoreCountry,
    playStoreId: row.playStoreId,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { profileId, platform } = body as { profileId?: number; platform?: string };

  let profile: ProfileConfig | null = null;

  if (profileId) {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, profileId));
    if (row) profile = parseProfile(row);
  }

  if (!profile) {
    const [row] = await db.select().from(profiles).where(eq(profiles.isDefault, 1)).limit(1);
    if (row) profile = parseProfile(row);
  }

  if (!profile) {
    return NextResponse.json({ error: "no profile found" }, { status: 404 });
  }

  runPipeline(profile, platform).catch((err) =>
    console.error("[API] Pipeline run error:", err)
  );

  return NextResponse.json({ status: "started", profileId: profile.id, profileName: profile.name, platform }, { status: 202 });
}
