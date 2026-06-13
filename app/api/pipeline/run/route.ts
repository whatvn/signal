import { runPipeline } from "@/lib/pipeline/runner";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const keyword = (body as { keyword?: string }).keyword ?? "ZaloPay";

  runPipeline(keyword).catch((err) =>
    console.error("[API] Pipeline run error:", err)
  );

  return NextResponse.json({ status: "started", keyword }, { status: 202 });
}
