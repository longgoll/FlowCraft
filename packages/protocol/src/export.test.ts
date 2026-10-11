import { describe, it, expect } from 'vitest';
import { toOpenTelemetryResourceSpans, toHar, toCurlCommand } from './export.js';
import type { TraceRecord } from './types.js';

describe('Trace Exporters', () => {
  const sampleTrace: TraceRecord = {
    id: '4bf92f3577b34da6a3ce929d0e0e4736',
    rootSpanId: '00f067aa0ba902b7',
    serviceName: 'Order Service',
    name: 'POST /api/orders',
    timestamp: 1700000000000,
    durationMs: 42.5,
    status: { code: 'OK' },
    http: {
      method: 'POST',
      url: 'http://localhost:3000/api/orders',
      path: '/api/orders',
      statusCode: 201,
      clientIp: '127.0.0.1',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { items: 2 },
    },
    spans: [
      {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        parentSpanId: null,
        name: 'POST /api/orders',
        kind: 'SERVER',
        startTime: 1700000000000,
        endTime: 1700000000042,
        durationMs: 42.5,
        status: { code: 'OK' },
        attributes: { 'http.status_code': 201 },
      },
    ],
  };

  it('should export valid OpenTelemetry ResourceSpans format', () => {
    const otel = toOpenTelemetryResourceSpans(sampleTrace);

    expect(otel.resourceSpans).toBeDefined();
    expect(otel.resourceSpans[0].scopeSpans[0].spans).toHaveLength(1);
    const span = otel.resourceSpans[0].scopeSpans[0].spans[0];
    expect(span.traceId).toBe(sampleTrace.id);
    expect(span.spanId).toBe(sampleTrace.rootSpanId);
    expect(span.kind).toBe(2); // SERVER = 2 in OTel
    expect(span.status.code).toBe(1); // OK = 1
  });

  it('should export valid HAR 1.2 format', () => {
    const har = toHar(sampleTrace);

    expect(har.log.version).toBe('1.2');
    expect(har.log.creator.name).toBe('TraceLens');
    expect(har.log.entries).toHaveLength(1);
    const entry = har.log.entries[0];
    expect(entry.request.method).toBe('POST');
    expect(entry.response.status).toBe(201);
    expect(entry.time).toBe(42.5);
  });

  it('should generate valid cURL command', () => {
    const curl = toCurlCommand(sampleTrace);

    expect(curl).toContain('curl -X POST "http://localhost:3000/api/orders"');
    expect(curl).toContain('-d \'{"items":2}\'');
    expect(curl).toContain('-H "content-type: application/json"');
  });
});
