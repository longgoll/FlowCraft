import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { tracelensFastifyPlugin } from './plugin.js';
import { startSpan } from '@tracelens/core';

describe('Fastify TraceLens Adapter', () => {
  it('should instrument Fastify routes and record traces', async () => {
    const app = Fastify();

    await app.register(tracelensFastifyPlugin, {
      serviceName: 'Fastify Test Service',
      endpoint: '/__lens',
    });

    app.get('/api/users', async () => {
      // Manual child span
      await startSpan('db.fastify.query', 'CLIENT', { 'db.system': 'postgresql' }, async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      return { users: ['Alice', 'Bob'] };
    });

    // 1. Send test request
    const response = await app.inject({
      method: 'GET',
      url: '/api/users',
    });

    expect(response.statusCode).toBe(200);
    const traceparent = response.headers['traceparent'];
    expect(traceparent).toBeDefined();

    // 2. Query Dashboard traces API
    const tracesRes = await app.inject({
      method: 'GET',
      url: '/__lens/api/traces',
    });

    expect(tracesRes.statusCode).toBe(200);
    const body = JSON.parse(tracesRes.payload);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);

    const recordedTrace = body.data[0];
    expect(recordedTrace.serviceName).toBe('Fastify Test Service');
    expect(recordedTrace.spans.length).toBeGreaterThanOrEqual(2);
    expect(recordedTrace.spans.some((s: any) => s.name === 'db.fastify.query')).toBe(true);

    // 3. Query Export API (OTel format)
    const exportRes = await app.inject({
      method: 'GET',
      url: `/__lens/api/traces/${recordedTrace.id}/export?format=otel`,
    });

    expect(exportRes.statusCode).toBe(200);
    const otelData = JSON.parse(exportRes.payload);
    expect(otelData.resourceSpans).toBeDefined();

    await app.close();
  });
});
