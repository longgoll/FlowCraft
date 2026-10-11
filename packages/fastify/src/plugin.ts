import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  parseTraceParent,
  generateTraceId,
  generateSpanId,
  formatTraceParent,
  sanitizeData,
  type TraceRecord,
  type SpanData,
  type TraceLensInitOptions,
  type ClientMetadata,
} from '@tracelens/protocol';
import { TraceHub, traceStorage, type TraceContextState } from '@tracelens/core';
import { registerFastifyDashboard } from './dashboard.js';
import { enableAutoPlugins } from '@tracelens/plugins';

const TRACE_STATE_SYM = Symbol('tracelens.state');

export async function tracelensFastifyPlugin(
  fastify: FastifyInstance,
  options: TraceLensInitOptions = {}
): Promise<void> {

  const endpoint = options.endpoint || '/__lens';
  const serviceName = options.serviceName || 'Fastify App';
  const hub = new TraceHub(options.maxHistory || 100);

  // Kích hoạt plugins tự động (outgoing fetch, DB, redis, prisma...)
  enableAutoPlugins();

  // Đăng ký dashboard routes
  registerFastifyDashboard(fastify, hub, endpoint);

  // Hook 1: onRequest - Khởi tạo Trace Context
  fastify.addHook('onRequest', async (req: FastifyRequest) => {
    // Bỏ qua các endpoint nội bộ của TraceLens
    if (req.url.startsWith(endpoint)) {
      return;
    }

    const startTime = Date.now();
    const traceParentHeader = req.headers['traceparent'] as string | undefined;
    const parentContext = parseTraceParent(traceParentHeader);

    const traceId = parentContext?.traceId || generateTraceId();
    const rootSpanId = generateSpanId();
    const parentSpanId = parentContext?.spanId || null;

    // Đọc metadata client từ browser/SDK nếu có
    let clientMeta: ClientMetadata | undefined;
    const clientHeader = req.headers['x-tracelens-client'] as string | undefined;
    if (clientHeader) {
      try {
        clientMeta = JSON.parse(clientHeader);
      } catch {
        // ignore
      }
    }

    const rootSpan: SpanData = {
      traceId,
      spanId: rootSpanId,
      parentSpanId,
      serviceName,
      name: `${req.method} ${req.routeOptions?.url || req.url}`,
      kind: 'SERVER',
      startTime,
      endTime: startTime,
      durationMs: 0,
      status: { code: 'UNSET' },
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.routeOptions?.url || req.url,
        'http.client_ip': req.ip,
        'http.user_agent': req.headers['user-agent'] || '',
      },
      events: [],
    };

    const trace: TraceRecord = {
      id: traceId,
      timestamp: startTime,
      rootSpanId,
      serviceName,
      name: `${req.method} ${req.routeOptions?.url || req.url}`,
      durationMs: 0,
      status: { code: 'UNSET' },
      http: {
        method: req.method,
        url: req.url,
        path: req.url.split('?')[0],
        route: req.routeOptions?.url,
        statusCode: 200,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'] || '',
        client: clientMeta,
        headers: sanitizeData(req.headers as Record<string, string>),
        query: options.captureArgs !== false ? (req.query as Record<string, unknown>) : undefined,
        params: options.captureArgs !== false ? (req.params as Record<string, unknown>) : undefined,
      },
      spans: [rootSpan],
    };

    const state: TraceContextState = {
      trace,
      activeSpan: rootSpan,
      spanStack: [rootSpan],
    };

    (req as any)[TRACE_STATE_SYM] = state;
    traceStorage.enterWith(state);
  });

  // Hook 2: preHandler - Đo thời gian route handler
  fastify.addHook('preHandler', async (req: FastifyRequest) => {
    const state = (req as any)[TRACE_STATE_SYM] as TraceContextState | undefined;
    if (!state) return;

    const handlerSpanId = generateSpanId();
    const startTime = Date.now();

    const handlerSpan: SpanData = {
      traceId: state.trace.id,
      spanId: handlerSpanId,
      parentSpanId: state.activeSpan.spanId,
      serviceName,
      name: `handler: ${req.routeOptions?.url || req.url}`,
      kind: 'INTERNAL',
      startTime,
      endTime: startTime,
      durationMs: 0,
      status: { code: 'UNSET' },
      attributes: {
        'fastify.route': req.routeOptions?.url || req.url,
      },
    };

    state.trace.spans.push(handlerSpan);

    const nextState: TraceContextState = {
      trace: state.trace,
      activeSpan: handlerSpan,
      spanStack: [...state.spanStack, handlerSpan],
    };

    (req as any)[TRACE_STATE_SYM] = nextState;
    traceStorage.enterWith(nextState);
  });

  // Hook 3: onSend - Inject header traceparent vào response
  fastify.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    const state = (req as any)[TRACE_STATE_SYM] as TraceContextState | undefined;
    if (state) {
      reply.header('traceparent', formatTraceParent({ traceId: state.trace.id, spanId: state.trace.rootSpanId }));
    }
    return payload;
  });

  // Hook 4: onError
  fastify.addHook('onError', async (req: FastifyRequest, _reply: FastifyReply, error: Error) => {
    const state = (req as any)[TRACE_STATE_SYM] as TraceContextState | undefined;
    if (state) {
      state.trace.status = {
        code: 'ERROR',
        message: error.message,
      };
      state.activeSpan.status = {
        code: 'ERROR',
        message: error.message,
      };
    }
  });

  // Hook 5: onResponse - Hoàn tất trace & ghi nhận
  fastify.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const state = (req as any)[TRACE_STATE_SYM] as TraceContextState | undefined;
    if (!state) return;

    const endTime = Date.now();
    const durationMs = Number((endTime - state.trace.timestamp).toFixed(2));
    const statusCode = reply.statusCode;

    state.trace.durationMs = durationMs;
    if (state.trace.http) {
      state.trace.http.statusCode = statusCode;
    }

    const rootSpan = state.trace.spans[0];
    if (rootSpan) {
      rootSpan.endTime = endTime;
      rootSpan.durationMs = durationMs;
      rootSpan.attributes['http.status_code'] = statusCode;
      if (statusCode >= 400 && rootSpan.status.code !== 'ERROR') {
        rootSpan.status = { code: 'ERROR', message: `HTTP ${statusCode}` };
      } else if (rootSpan.status.code === 'UNSET') {
        rootSpan.status = { code: 'OK' };
      }
    }

    // Hoàn tất tất cả spans con chưa có endTime
    for (const span of state.trace.spans) {
      if (span.endTime <= span.startTime) {
        span.endTime = endTime;
        span.durationMs = Number((span.endTime - span.startTime).toFixed(2));
      }
      if (span.status.code === 'UNSET') {
        span.status = { code: 'OK' };
      }
    }

    if (statusCode >= 400 && state.trace.status.code !== 'ERROR') {
      state.trace.status = { code: 'ERROR', message: `HTTP ${statusCode}` };
    } else if (state.trace.status.code === 'UNSET') {
      state.trace.status = { code: 'OK' };
    }

    // Ghi vào Hub bộ nhớ RAM local
    hub.recordTrace(state.trace);

    // Gửi về Central Hub qua HTTP Ingestion nếu có cấu hình
    if (options.hubUrl) {
      fetch(options.hubUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state.trace),
      }).catch(() => {});
    }
  });
}

(tracelensFastifyPlugin as any)[Symbol.for('skip-override')] = true;

