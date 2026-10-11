import { describe, it, expect } from 'vitest';
import { injectQueueTrace, extractQueueTrace, withJobContext } from './index.js';
import { getActiveContext } from '@tracelens/core';

describe('Queue / Job Tracing Instrumentation', () => {
  it('injects distributed trace context vào payload', () => {
    const rawJob = { orderId: 'ord_123', amount: 500 };
    const injected = injectQueueTrace(rawJob, 'order-processing');

    expect(injected.orderId).toBe('ord_123');
    expect(injected._tracelens).toBeDefined();
    expect(injected._tracelens.queueName).toBe('order-processing');
    expect(injected._tracelens.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('extracts metadata từ job payload chính xác', () => {
    const injected = injectQueueTrace({ email: 'user@test.com' }, 'email-queue');
    const extracted = extractQueueTrace(injected);

    expect(extracted).not.toBeNull();
    expect(extracted?.queueName).toBe('email-queue');
    expect(extracted?.traceparent).toBe(injected._tracelens.traceparent);
  });

  it('xử lý job bên trong trace context với withJobContext', async () => {
    const jobPayload = injectQueueTrace({ taskId: 'task_88' }, 'tasks');

    let capturedTraceId: string | undefined;
    const result = await withJobContext('ProcessTask', jobPayload, async () => {
      const ctx = getActiveContext();
      capturedTraceId = ctx?.trace.id;
      return 'task-done';
    });

    expect(result).toBe('task-done');
    expect(capturedTraceId).toBeDefined();
    expect(capturedTraceId).toHaveLength(32);
  });
});
