type Controller = ReadableStreamDefaultController<Uint8Array>;

// Anchored on globalThis so all Next.js route-handler module instances share one Set.
const g = globalThis as typeof globalThis & { _sseControllers?: Set<Controller> };
if (!g._sseControllers) g._sseControllers = new Set();
const controllers = g._sseControllers;

const encoder = new TextEncoder();

export function addClient(controller: Controller) {
  controllers.add(controller);
}

export function removeClient(controller: Controller) {
  controllers.delete(controller);
}

export function broadcast(event: Record<string, unknown>) {
  const chunk = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  for (const ctrl of controllers) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      controllers.delete(ctrl);
    }
  }
}
