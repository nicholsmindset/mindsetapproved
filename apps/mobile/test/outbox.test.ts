import { describe, expect, it, vi } from 'vitest';
import { memoryKV } from '../src/core/kv';
import { createOutbox, isPermanent, MAX_ATTEMPTS, PermanentError, type Job } from '../src/core/outbox';

const job = (n: number): Job => ({ kind: 'unmatched', terms: [`t${n}`], example: '' });
const ids = () => {
  let n = 0;
  return () => `j${++n}`;
};

describe('outbox', () => {
  it('sends immediately when online', async () => {
    const send = vi.fn(async () => undefined);
    const box = createOutbox(memoryKV(), ids(), send);
    expect(await box.enqueue(job(1))).toBe(true);
    expect(box.pending()).toBe(0);
  });

  it('keeps jobs offline and sends them in order later', async () => {
    let online = false;
    const sent: string[] = [];
    const send = vi.fn(async (j: Job) => {
      if (!online) throw new Error('Network request failed');
      sent.push((j as { terms: string[] }).terms[0]!);
    });
    const kv = memoryKV();
    const box = createOutbox(kv, ids(), send);
    expect(await box.enqueue(job(1))).toBe(false);
    expect(await box.enqueue(job(2))).toBe(false);
    expect(box.pending()).toBe(2);
    online = true;
    // a fresh outbox on the same storage (app restart) still has them
    const after = createOutbox(kv, ids(), send);
    expect(await after.flush()).toEqual({ sent: 2, remaining: 0 });
    expect(sent).toEqual(['t1', 't2']);
  });

  it('drops a job the server will never accept, without blocking the rest', async () => {
    const send = vi.fn(async (j: Job) => {
      if ((j as { terms: string[] }).terms[0] === 't1') throw new PermanentError('violates check constraint');
    });
    const box = createOutbox(memoryKV(), ids(), send);
    await box.enqueue(job(1));
    expect(await box.enqueue(job(2))).toBe(true);
    expect(box.pending()).toBe(0);
  });

  it('gives up after the maximum attempts', async () => {
    const send = vi.fn(async () => {
      throw new Error('500');
    });
    const box = createOutbox(memoryKV(), ids(), send);
    await box.enqueue(job(1));
    for (let i = 1; i < MAX_ATTEMPTS; i++) await box.flush();
    expect(box.pending()).toBe(0);
  });

  it('shares one run between concurrent flushes', async () => {
    let calls = 0;
    const send = vi.fn(async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
    });
    const kv = memoryKV({ 'outbox.v1': JSON.stringify([{ id: 'a', job: job(1), attempts: 0, queuedAt: '' }]) });
    const box = createOutbox(kv, ids(), send);
    await Promise.all([box.flush(), box.flush(), box.flush()]);
    expect(calls).toBe(1);
  });

  it('classifies permanent server errors', () => {
    expect(isPermanent('23505')).toBe(true); // unique violation
    expect(isPermanent('22023')).toBe(true); // invalid parameter
    expect(isPermanent('42501')).toBe(true); // permission denied
    expect(isPermanent('P0002')).toBe(true); // not found
    expect(isPermanent('08006')).toBe(false); // connection failure
    expect(isPermanent(undefined)).toBe(false);
  });
});
