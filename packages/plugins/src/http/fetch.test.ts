import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { instrumentFetch, resetFetchInstrumentation } from './fetch.js';
import { traceStorage } from '@tracelens/core';
import type { TraceRecord, SpanData } from '@tracelens/protocol';

describe('Fetch Instrumentation Plugin', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetFetchInstrumentation();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetFetchInstrumentation();
  });

  it('should inject W3C traceparent header when running inside trace context', async () => {
    const rootSpan: SpanData = {
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      parentSpanId: null,
      name: 'root',
      kind: 'SERVER',
      startTime: Date.now(),
      endTime: Date.now(),
      durationMs: 0,
      status: { code: 'UNSET' },
      attributes: {},
    };

    const trace: TraceRecord = {
      id: '4bf92f3577b34da6a3ce929d0e0e4736',
      rootSpanId: '00f067aa0ba902b7',
      name: 'test',
      timestamp: Date.now(),
      durationMs: 0,
      status: { code: 'UNSET' },
      spans: [rootSpan],
    };

    let capturedHeaders: Headers | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (_input: any, init?: RequestInit) => {
      capturedHeaders = init?.headers as Headers;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    instrumentFetch(true);

    await traceStorage.run({ trace, activeSpan: rootSpan, spanStack: [rootSpan] }, async () => {
      await fetch('https://api.example.com/data');
    });

    expect(capturedHeaders).toBeDefined();
    const traceparent = capturedHeaders?.get('traceparent');
    expect(traceparent).toBeDefined();
    expect(traceparent).toMatch(/^00-4bf92f3577b34da6a3ce929d0e0e4736-[0-9a-f]{16}-01$/);
    expect(trace.spans).toHaveLength(2);
    expect(trace.spans[1].name).toBe('HTTP GET api.example.com/data');
  });
});
