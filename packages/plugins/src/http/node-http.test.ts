import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { runWithTraceContext } from '@tracelens/core';
import { instrumentNodeHttp, resetNodeHttpInstrumentation } from './node-http.js';

describe('Node HTTP Instrumentation', () => {
  let server: http.Server;
  let port: number;
  let receivedHeaders: Record<string, string | string[] | undefined> = {};

  beforeEach(async () => {
    resetNodeHttpInstrumentation();
    instrumentNodeHttp();

    server = http.createServer((req, res) => {
      receivedHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('tự động inject header traceparent khi gọi http.request bên trong trace context', async () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const parentSpanId = '00f067aa0ba902b7';

    await runWithTraceContext({ traceId, parentSpanId }, async () => {
      await new Promise<void>((resolve, reject) => {
        const req = http.request(
          `http://localhost:${port}/test`,
          { method: 'GET' },
          (res) => {
            res.on('data', () => {});
            res.on('end', () => resolve());
          }
        );
        req.on('error', reject);
        req.end();
      });
    });

    expect(receivedHeaders['traceparent']).toBeDefined();
    expect(String(receivedHeaders['traceparent'])).toMatch(/^00-4bf92f3577b34da6a3ce929d0e0e4736-[0-9a-f]{16}-01$/);
  });
});
