import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyDashboardAuth, type TraceHub } from '@tracelens/core';
import { renderEmbeddedHtml } from '@tracelens/core';
import { toOpenTelemetryResourceSpans, toHar, toCurlCommand, type DashboardAuthOptions } from '@tracelens/protocol';
import crypto from 'node:crypto';

export function registerFastifyDashboard(
  fastify: FastifyInstance,
  hub: TraceHub,
  endpoint = '/__lens',
  authOptions?: DashboardAuthOptions
): void {
  if (authOptions) {
    fastify.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
      if (req.url.startsWith(endpoint)) {
        const isAuthorized = verifyDashboardAuth(
          { headers: req.headers as Record<string, string>, query: req.query as Record<string, unknown>, url: req.url },
          authOptions
        );
        if (!isAuthorized) {
          reply.header('WWW-Authenticate', 'Basic realm="TraceLens Dashboard"');
          reply.status(401).send('Unauthorized: TraceLens Dashboard is protected.');
        }
      }
    });
  }

  // 1. SSE Realtime stream
  fastify.get(`${endpoint}/events`, (req: FastifyRequest, reply: FastifyReply) => {
    const rawRes = reply.raw;
    rawRes.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const clientId = crypto.randomUUID();
    hub.addClient(clientId, rawRes);

    const interval = setInterval(() => {
      rawRes.write(': keepalive\n\n');
    }, 15000);

    req.raw.on('close', () => {
      clearInterval(interval);
      hub.removeClient(clientId);
    });
  });

  // 2. API lấy danh sách traces
  fastify.get(`${endpoint}/api/traces`, async () => {
    return {
      success: true,
      data: hub.getRecentTraces(),
    };
  });

  // 3. API lấy chi tiết 1 trace
  fastify.get(`${endpoint}/api/traces/:id`, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const trace = hub.getTraceById(req.params.id);
    if (!trace) {
      reply.status(404);
      return { success: false, error: 'Trace not found' };
    }
    return { success: true, data: trace };
  });

  // 4. API Export trace (OTel JSON / HAR / cURL)
  fastify.get(`${endpoint}/api/traces/:id/export`, async (req: FastifyRequest<{ Params: { id: string }; Querystring: { format?: string } }>, reply: FastifyReply) => {
    const traceId = req.params.id;
    const format = req.query.format || 'json';
    const trace = hub.getTraceById(traceId);

    if (!trace) {
      reply.status(404);
      return { success: false, error: 'Trace not found' };
    }

    if (format === 'otel') {
      reply.header('Content-Disposition', `attachment; filename="trace-${traceId}-otel.json"`);
      return toOpenTelemetryResourceSpans(trace);
    }

    if (format === 'har') {
      reply.header('Content-Disposition', `attachment; filename="trace-${traceId}.har"`);
      reply.header('Content-Type', 'application/json');
      return toHar(trace);
    }

    if (format === 'curl') {
      reply.header('Content-Type', 'text/plain; charset=utf-8');
      return toCurlCommand(trace);
    }

    reply.header('Content-Disposition', `attachment; filename="trace-${traceId}.json"`);
    return trace;
  });

  // 5. Ingest trace từ microservice khác
  fastify.post(`${endpoint}/api/ingest`, async (req: FastifyRequest, reply: FastifyReply) => {
    const incomingTrace = req.body as any;
    if (incomingTrace && incomingTrace.id) {
      hub.ingestTrace(incomingTrace);
      return { success: true, message: 'Trace ingested successfully' };
    }
    reply.status(400);
    return { success: false, error: 'Invalid trace payload' };
  });

  // 6. Xóa cache
  fastify.post(`${endpoint}/api/clear`, async () => {
    hub.clear();
    return { success: true, message: 'Traces cleared' };
  });

  // 7. Serve Web UI
  fastify.get(endpoint, async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.type('text/html; charset=utf-8');
    return renderEmbeddedHtml(endpoint);
  });

  fastify.get(`${endpoint}/*`, async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.type('text/html; charset=utf-8');
    return renderEmbeddedHtml(endpoint);
  });
}
