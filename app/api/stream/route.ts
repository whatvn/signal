import { addClient, removeClient } from "@/lib/sse";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET() {
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      addClient(ctrl);
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
    },
    cancel() {
      removeClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
