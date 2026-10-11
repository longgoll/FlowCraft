import { describe, it, expect, vi } from 'vitest';
import { OtlpHttpExporter } from './exporter.js';
import type { TraceRecord } from '@tracelens/protocol';

describe('OtlpHttpExporter', () => {
  it('gom batch và flush dữ liệu OTLP chính xác', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock;

    const exporter = new OtlpHttpExporter({
      endpoint: 'http://localhost:4318/v1/traces',
      batchSize: 2,
      flushIntervalMs: 10000,
    });

    const mockTrace: TraceRecord = {
      id: '4bf92f3577b34da6a3ce929d0e0e4736',
      rootSpanId: '00f067aa0ba902b7',
      name: 'GET /orders',
      timestamp: Date.now(),
      durationMs: 12,
      status: { code: 'OK' },
      spans: [
        {
          traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
          spanId: '00f067aa0ba902b7',
          parentSpanId: null,
          name: 'HTTP GET /orders',
          kind: 'SERVER',
          startTime: Date.now(),
          endTime: Date.now() + 12,
          durationMs: 12,
          status: { code: 'OK' },
          attributes: {},
        },
      ],
    };

    exporter.enqueue(mockTrace);
    // Chưa đủ batchSize 2 nên chưa flush
    expect(fetchMock).not.toHaveBeenCalled();

    exporter.enqueue(mockTrace);
    // Đã đủ batchSize 2, đợi flush
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe('http://localhost:4318/v1/traces');
    const body = JSON.parse(callArgs[1].body);
    expect(body.resourceSpans).toBeDefined();
    expect(body.resourceSpans.length).toBe(2);

    exporter.destroy();
  });
});
