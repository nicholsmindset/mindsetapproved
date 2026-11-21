import type { KV } from './kv';

/** Server writes the app makes. They are queued on the phone and sent in order, so nothing is lost offline. */
export type Job =
  | { kind: 'scan'; row: Record<string, unknown>; text: string }
  | { kind: 'unmatched'; terms: string[]; example: string }
  | { kind: 'product'; barcode: string; text: string; name?: string; brand?: string }
  | { kind: 'report'; scanId: string; reason: string; comment?: string }
  | { kind: 'scanUpdate'; scanId: string; favourite?: boolean; text?: string; verdict?: string };

export interface QueuedJob {
  id: string;
  job: Job;
  attempts: number;
  queuedAt: string;
}

/** Thrown by a sender for errors that retrying won't fix (validation, permissions, missing rows). */
export class PermanentError extends Error {}

const KEY = 'outbox.v1';
export const OUTBOX_CAP = 500;
export const MAX_ATTEMPTS = 8;

/** PostgREST/Postgres error codes that mean "this request will never succeed". */
export function isPermanent(code: string | undefined): boolean {
  if (!code) return false;
  return /^(22|23|42|P0002|PGRST1|PGRST2)/.test(code) && code !== '42P01';
}

export function createOutbox(kv: KV, newId: () => string, send: (job: Job) => Promise<void>) {
  const read = (): QueuedJob[] => {
    try {
      return JSON.parse(kv.getString(KEY) ?? '[]') as QueuedJob[];
    } catch {
      return [];
    }
  };
  const write = (q: QueuedJob[]) => kv.set(KEY, JSON.stringify(q));
  let flushing: Promise<{ sent: number; remaining: number }> | null = null;

  async function drain(): Promise<{ sent: number; remaining: number }> {
    let sent = 0;
    for (;;) {
      const q = read();
      const head = q[0];
      if (!head) return { sent, remaining: 0 };
      try {
        await send(head.job);
        write(read().filter((j) => j.id !== head.id));
        sent++;
      } catch (e) {
        if (e instanceof PermanentError || head.attempts + 1 >= MAX_ATTEMPTS) {
          write(read().filter((j) => j.id !== head.id)); // can never succeed: drop it so later jobs aren't stuck
          continue;
        }
        write(read().map((j) => (j.id === head.id ? { ...j, attempts: j.attempts + 1 } : j)));
        return { sent, remaining: read().length }; // offline or server down: keep order, try again later
      }
    }
  }

  return {
    pending: () => read().length,
    jobs: read,
    /** Queues a job and tries to send everything. Resolves true if this job has been sent. */
    async enqueue(job: Job): Promise<boolean> {
      const id = newId();
      const q = [...read(), { id, job, attempts: 0, queuedAt: new Date().toISOString() }];
      write(q.slice(-OUTBOX_CAP));
      await this.flush();
      return !read().some((j) => j.id === id);
    },
    /** Sends queued jobs in order; concurrent calls share one run. */
    flush(): Promise<{ sent: number; remaining: number }> {
      flushing ??= drain().finally(() => {
        flushing = null;
      });
      return flushing;
    },
    clear: () => kv.remove(KEY),
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
