import type { TraceRecord, SpanData, ClientMetadata } from '@tracelens/protocol';
import { parseTraceParent, generateTraceId, generateSpanId, sanitizeData } from '@tracelens/protocol';
import { traceStorage, TraceHub } from '@tracelens/core';

export interface NestMiddlewareOptions {
  hub: TraceHub;
  serviceName?: string;
  excludePaths?: string[];
}

export function createTraceLensNestMiddleware(options: NestMiddlewareOptions) {
  const { hub, serviceName = 'nestjs-app', excludePaths = ['/__lens'] } = options;

  return function traceLensMiddleware(req: any, res: any, next: () => void) {
    const url = req.originalUrl || req.url || '/';

    // Bỏ qua các endpoint dashboard hoặc excluded
    if (excludePaths.some((p) => url.startsWith(p))) {
      return next();
    }

    const headerTraceParent = req.headers?.['traceparent'];
    const parsedW3c = headerTraceParent ? parseTraceParent(headerTraceParent) : null;

    const traceId = parsedW3c?.traceId || generateTraceId();
    const rootSpanId = parsedW3c?.spanId || generateSpanId();
    const startTime = Date.now();

    // Client metadata từ @tracelens/browser nếu có
    let clientMeta: ClientMetadata | undefined;
    const clientHeader = req.headers?.['x-tracelens-client'];
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
      parentSpanId: null,
      name: `HTTP ${req.method} ${url.split('?')[0]}`,
      kind: 'SERVER',
      startTime,
      endTime: startTime,
      durationMs: 0,
      status: { code: 'UNSET' },
      attributes: {
        'service.name': serviceName,
        'http.method': req.method,
        'http.url': url,
      },
      events: [],
    };

    const trace: TraceRecord = {
      id: traceId,
      rootSpanId,
      name: `${req.method} ${url.split('?')[0]}`,
      timestamp: startTime,
      durationMs: 0,
      serviceName,
      status: { code: 'UNSET' },
      http: {
        method: req.method,
        path: url.split('?')[0],
        url,
        statusCode: 200,
        query: req.query ? sanitizeData(req.query) : undefined,
        headers: sanitizeData(req.headers || {}),
        body: req.body ? sanitizeData(req.body) : undefined,
        clientIp: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
        client: clientMeta,
      },
      spans: [rootSpan],
    };

    const onFinish = () => {
      res.removeListener('finish', onFinish);
      res.removeListener('close', onFinish);

      const endTime = Date.now();
      const durationMs = Math.max(0.1, endTime - startTime);

      rootSpan.endTime = endTime;
      rootSpan.durationMs = durationMs;
      trace.durationMs = durationMs;

      const statusCode = res.statusCode || 200;
      if (trace.http) {
        trace.http.statusCode = statusCode;
      }

      if (statusCode >= 400) {
        rootSpan.status = { code: 'ERROR', message: `HTTP ${statusCode}` };
        trace.status = { code: 'ERROR', message: `HTTP ${statusCode}` };
      } else {
        rootSpan.status = { code: 'OK' };
        trace.status = { code: 'OK' };
      }

      hub.recordTrace(trace);
    };

    res.once('finish', onFinish);
    res.once('close', onFinish);

    traceStorage.run({ trace, activeSpan: rootSpan, spanStack: [rootSpan] }, () => {
      next();
    });
  };
}
