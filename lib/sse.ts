type Controller = ReadableStreamDefaultController<Uint8Array>;

const controllers = new Set<Controller>();
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
