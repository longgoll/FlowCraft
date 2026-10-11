import { describe, it, expect } from 'vitest';
import { traceStorage, startSpan, getActiveContext, getActiveSpan } from './context.js';
import type { TraceRecord, SpanData } from '@tracelens/protocol';

describe('TraceContext & AsyncLocalStorage', () => {
  const setupMockState = () => {
    const rootSpan: SpanData = {
      traceId: 'tr_test',
      spanId: 'root_span_1',
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
      id: 'tr_test',
      rootSpanId: 'root_span_1',
      name: 'GET /test',
      timestamp: Date.now(),
      durationMs: 0,
      status: { code: 'UNSET' },
      spans: [rootSpan],
    };

    return { trace, rootSpan };
  };

  it('should manage nested spans properly inside async context', async () => {
    const { trace, rootSpan } = setupMockState();

    await traceStorage.run({ trace, activeSpan: rootSpan, spanStack: [rootSpan] }, async () => {
      expect(getActiveContext()?.trace.id).toBe('tr_test');
      expect(getActiveSpan()?.spanId).toBe('root_span_1');

      await startSpan('db.query', 'CLIENT', { 'db.system': 'postgresql' }, async (childSpan) => {
        expect(childSpan.name).toBe('db.query');
        expect(childSpan.parentSpanId).toBe('root_span_1');
        expect(getActiveSpan()?.spanId).toBe(childSpan.spanId);
      });

      // Context returns to rootSpan after childSpan finishes
      expect(getActiveSpan()?.spanId).toBe('root_span_1');
    });

    expect(trace.spans).toHaveLength(2);
    expect(trace.spans[1].name).toBe('db.query');
    expect(trace.spans[1].status.code).toBe('OK');
  });

  it('should mark span as ERROR if wrapped function throws', async () => {
    const { trace, rootSpan } = setupMockState();

    await traceStorage.run({ trace, activeSpan: rootSpan, spanStack: [rootSpan] }, async () => {
      await expect(
        startSpan('failing.action', 'INTERNAL', {}, async () => {
          throw new Error('Database connection timeout');
        })
      ).rejects.toThrow('Database connection timeout');
    });

    expect(trace.spans).toHaveLength(2);
    const failedSpan = trace.spans[1];
    expect(failedSpan.status.code).toBe('ERROR');
    expect(failedSpan.status.message).toBe('Database connection timeout');
  });
});
