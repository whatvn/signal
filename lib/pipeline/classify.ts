import OpenAI from "openai";
import { db } from "@/db";
import { classifications } from "@/db/schema";
import { broadcast } from "@/lib/sse";
import { PostWithComments } from "./extract";
import { Emit } from "./runner";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";
import { posts } from "@/db/schema";

const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY ?? "no-key",
});
const MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

function buildSystemPrompt(appName: string): string {
  return `You are a social media analyst for ${appName}, a Vietnamese digital payment application widely used in Vietnam.
Classify each social media post + comments bundle according to the taxonomy below.
Posts may be in Vietnamese, English, or both. Use the combined context of caption and comments to classify.
Return a JSON object with a single key "results" containing an array in exactly the same order as the input array.

TAXONOMY:
Negative sentiments:
- fraud_scam: fake ${appName} accounts, phishing links, impersonation, scam warnings
- fund_loss: unexplained balance deductions, money disappeared, unauthorized charges
- app_bugs: crashes, freezes, errors, app not working
- transaction_failure: payment failed, transfer stuck, QR not working
- poor_support: slow response, unhelpful customer service, unresolved issues
- feature_gap: missing feature, not useful, feature request frustration

Positive sentiments:
- promotion_cashback: love for promotions, cashback rewards, vouchers, deals
- feature_praise: praise for specific features (send money, pay bills, etc.)
- ux_speed_praise: praise for app speed, smooth UX, good design
- recommendation: word-of-mouth sharing, recommending to friends/family

OUTPUT FORMAT (strict JSON object, results array in same order as input):
{"results":[{"post_id":"...","sentiment":"positive|negative","subcategory":"...","confidence":0.0}]}`;
}

interface ClassifyInput {
  post_id: string;
  caption: string;
  comments: string[];
}

interface ClassifyOutput {
  post_id: string;
  sentiment: "positive" | "negative";
  subcategory: string;
  confidence: number;
}

async function classifyBatch(
  batch: ClassifyInput[],
  systemPrompt: string
): Promise<ClassifyOutput[]> {
  const userMessage = `Classify these ${batch.length} posts:\n${JSON.stringify(batch, null, 2)}`;

  let attempt = 0;
  while (attempt < 2) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 20000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "";
      const parsed = (JSON.parse(text) as { results: ClassifyOutput[] }).results;
      if (!Array.isArray(parsed)) throw new Error("results is not an array");
      return parsed;
    } catch (err) {
      attempt++;
      if (attempt >= 2) {
        console.error("[Classify] Batch failed after retry:", err);
        return batch.map((b) => ({
          post_id: b.post_id,
          sentiment: "negative" as const,
          subcategory: "feature_gap",
          confidence: 0,
        }));
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return [];
}

export async function classifyStage(items: PostWithComments[], emit: Emit, profileName = "ZaloPay"): Promise<void> {
  const systemPrompt = buildSystemPrompt(profileName);
  if (items.length === 0) return;

  const BATCH_SIZE = 20;
  const now = Math.floor(Date.now() / 1000);
  const totalBatches = Math.ceil(items.length / BATCH_SIZE);
  emit("info", `Classifying ${items.length} posts in ${totalBatches} batch(es) via ${MODEL}…`);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = items.slice(i, i + BATCH_SIZE);
    emit("info", `Batch ${batchNum}/${totalBatches}: sending ${batch.length} posts to LLM…`);

    const inputs: ClassifyInput[] = batch.map(({ post, comments }) => ({
      post_id: post.id,
      caption: post.contentText,
      comments: comments.slice(0, 30).map((c) => c.contentText),
    }));

    const results = await classifyBatch(inputs, systemPrompt);
    emit("info", `Batch ${batchNum}/${totalBatches}: received ${results.length} results`);

    for (const result of results) {
      const item = batch.find((b) => b.post.id === result.post_id);
      if (!item) continue;

      const conf = Math.round(result.confidence * 100);
      emit("info", `  ${result.post_id.slice(0, 12)}… → ${result.sentiment} / ${result.subcategory} (${conf}%)`);

      await db
        .insert(classifications)
        .values({
          id: ulid(),
          postId: result.post_id,
          sentiment: result.sentiment,
          subcategory: result.subcategory,
          confidence: result.confidence,
          commentCount: item.comments.length,
          classifiedAt: now,
          modelUsed: MODEL,
          inputTokens: 0,
          outputTokens: 0,
        })
        .onConflictDoNothing();

      const postRow = await db
        .select()
        .from(posts)
        .where(eq(posts.id, result.post_id))
        .get();

      if (postRow) {
        broadcast({
          type: "new_post",
          post: {
            ...postRow,
            sentiment: result.sentiment,
            subcategory: result.subcategory,
            confidence: result.confidence,
            commentCount: item.comments.length,
          },
        });
      }
    }
  }

  console.log(`[Classify] ${items.length} posts classified`);
}
