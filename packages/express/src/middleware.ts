import type { Request, Response, NextFunction } from 'express';
import {
  generateTraceId,
  generateSpanId,
  parseTraceParent,
  formatTraceParent,
  sanitizeData,
  type TraceRecord,
  type SpanData,
  type TraceLensInitOptions,
} from '@tracelens/protocol';
import { traceStorage, type TraceHub, type TraceContextState } from '@tracelens/core';

export function createTraceMiddleware(hub: TraceHub, options: TraceLensInitOptions = {}) {
  const endpoint = options.endpoint || '/__lens';

  return function tracelensMiddleware(req: Request, res: Response, next: NextFunction) {
    // Bỏ qua các request nội bộ của chính Dashboard UI
    if (req.path.startsWith(endpoint)) {
      return next();
    }

    // 1. Kiểm tra header W3C `traceparent` từ upstream (frontend hoặc gateway)
    const incomingTraceParent = req.headers['traceparent'] as string | undefined;
    const parsedContext = parseTraceParent(incomingTraceParent);

    // Đọc metadata từ Frontend SDK (@tracelens/browser)
    let clientMeta: any = undefined;
    const clientHeader = req.headers['x-tracelens-client'] as string | undefined;
    if (clientHeader) {
      try {
        clientMeta = JSON.parse(clientHeader);
      } catch {
        // ignore
      }
    }

    const traceId = parsedContext?.traceId || generateTraceId();
    const rootSpanId = generateSpanId();
    const parentSpanId = parsedContext?.spanId || null;

    const startTime = Date.now();

    const serviceName = options.serviceName || 'Express API';

    // 2. Tạo Root Span
    const rootSpan: SpanData = {
      traceId,
      spanId: rootSpanId,
      parentSpanId,
      serviceName,
      name: `${req.method} ${req.baseUrl || ''}${req.path}`,
      kind: 'SERVER',
      startTime,
      endTime: startTime,
      durationMs: 0,
      status: { code: 'UNSET' },
      attributes: {
        'http.method': req.method,
        'http.url': req.originalUrl || req.url,
        'http.target': req.path,
        'http.client_ip': req.ip || req.socket.remoteAddress,
        'http.user_agent': req.headers['user-agent'],
        ...(clientMeta ? {
          'client.service': clientMeta.service,
          'client.component': clientMeta.component,
          'client.action': clientMeta.action,
        } : {}),
      },
      events: [],
    };

    // 3. Tạo Trace Record
    const traceRecord: TraceRecord = {
      id: traceId,
      timestamp: startTime,
      rootSpanId,
      serviceName,
      name: `${req.method} ${req.path}`,
      durationMs: 0,
      http: {
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        statusCode: 200,
        clientIp: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        client: clientMeta,
        headers: sanitizeData(req.headers as Record<string, string>),
        query: options.captureArgs !== false ? sanitizeData(req.query) : undefined,
        params: options.captureArgs !== false ? sanitizeData(req.params) : undefined,
      },
      status: { code: 'UNSET' },
      spans: [rootSpan],
    };

    // Gán traceparent vào response header để client có thể correlate
    res.setHeader('traceparent', formatTraceParent({ traceId, spanId: rootSpanId }));

    // 4. Hook sự kiện kết thúc HTTP request
    const finalizeTrace = () => {
      const endTime = Date.now();
      const duration = Math.max(0.1, Number((endTime - startTime).toFixed(2)));

      rootSpan.endTime = endTime;
      rootSpan.durationMs = duration;
      rootSpan.status = res.statusCode >= 400 ? { code: 'ERROR', message: `HTTP ${res.statusCode}` } : { code: 'OK' };

      traceRecord.durationMs = duration;
      if (traceRecord.http) {
        traceRecord.http.statusCode = res.statusCode;
      }
      traceRecord.status = rootSpan.status;

      // Đảm bảo mọi span trong trace đều có serviceName
      for (const s of traceRecord.spans) {
        if (!s.serviceName) {
          s.serviceName = serviceName;
        }
      }

      // Lưu trace vào RingBuffer nội bộ
      hub.recordTrace(traceRecord);

      // Nếu có cấu hình hubUrl, forward trace về Hub trung tâm
      if (options.hubUrl) {
        fetch(options.hubUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(traceRecord),
        }).catch(() => {
          // im lặng bỏ qua nếu hub tạm thời unreachable
        });
      }
    };

    res.once('finish', finalizeTrace);
    res.once('close', () => {
      if (!res.writableEnded) {
        finalizeTrace();
      }
    });

    // 5. Chạy tiếp tục với AsyncLocalStorage context
    const contextState: TraceContextState = {
      trace: traceRecord,
      activeSpan: rootSpan,
      spanStack: [rootSpan],
    };

    traceStorage.run(contextState, () => {
      next();
    });
  };
}
