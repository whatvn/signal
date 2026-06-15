import { runPipeline } from "@/lib/pipeline/runner";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { keyword = "ZaloPay", platform } = body as { keyword?: string; platform?: string };

  runPipeline(keyword, platform).catch((err) =>
    console.error("[API] Pipeline run error:", err)
  );

  return NextResponse.json({ status: "started", keyword, platform }, { status: 202 });
}
