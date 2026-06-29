import type { BoardEvent } from '@taskflow/types';

type Listener = (event: BoardEvent) => void;

/**
 * In-process pub/sub for realtime board events, keyed by projectId. Mutations
 * call `emit`; the tRPC `task.onBoardChange` subscription consumes `subscribe`.
 *
 * This is intentionally simple (single-process). A multi-instance deployment
 * would back this with Redis pub/sub or Postgres LISTEN/NOTIFY — noted in the
 * README under "Known limitations".
 */
export class BoardEventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  emit(projectId: string, event: BoardEvent): void {
    const set = this.listeners.get(projectId);
    if (!set) return;
    for (const listener of set) listener(event);
  }

  private add(projectId: string, listener: Listener): void {
    let set = this.listeners.get(projectId);
    if (!set) {
      set = new Set();
      this.listeners.set(projectId, set);
    }
    set.add(listener);
  }

  private remove(projectId: string, listener: Listener): void {
    const set = this.listeners.get(projectId);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) this.listeners.delete(projectId);
  }

  /** Async generator of events for a project until the signal aborts. */
  async *subscribe(projectId: string, signal: AbortSignal): AsyncGenerator<BoardEvent> {
    const queue: BoardEvent[] = [];
    let notify: (() => void) | null = null;

    const listener: Listener = (event) => {
      queue.push(event);
      notify?.();
      notify = null;
    };

    this.add(projectId, listener);
    try {
      while (!signal.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            notify = resolve;
            signal.addEventListener('abort', () => resolve(), { once: true });
          });
          continue;
        }
        const event = queue.shift();
        if (event) yield event;
      }
    } finally {
      this.remove(projectId, listener);
    }
  }
}

export const boardEvents = new BoardEventBus();
