import { runWithTraceContext, startSpan } from '@tracelens/core';
import { generateTraceId, generateSpanId, parseTraceParent, formatTraceParent } from '@tracelens/protocol';
import type { SpanKind } from '@tracelens/protocol';

export interface TraceLensSocketMetadata {
  traceparent: string;
  sentAt?: number;
  eventName?: string;
  room?: string;
}

/**
 * Chèn distributed trace metadata vào payload trước khi phát (emit / send) qua WebSocket hoặc Socket.io
 */
export function injectSocketTrace<T extends Record<string, any>>(
  payload: T,
  eventName?: string,
  room?: string
): T & { _tracelens: TraceLensSocketMetadata } {
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  const traceparent = formatTraceParent({ traceId, spanId });

  return {
    ...payload,
    _tracelens: {
      traceparent,
      sentAt: Date.now(),
      eventName,
      room,
    },
  };
}

/**
 * Trích xuất trace metadata từ payload của tin nhắn WebSocket / Socket.io
 */
export function extractSocketTrace(payload: any): TraceLensSocketMetadata | null {
  if (payload && typeof payload === 'object' && payload._tracelens?.traceparent) {
    return payload._tracelens;
  }
  return null;
}

/**
 * Chạy Socket Handler xử lý event bên trong Trace Context tương ứng
 */
export async function withSocketContext<T>(
  eventName: string,
  payload: any,
  handler: () => Promise<T> | T,
  options?: { kind?: SpanKind; attributes?: Record<string, any> }
): Promise<T> {
  const meta = extractSocketTrace(payload);
  const parsed = meta?.traceparent ? parseTraceParent(meta.traceparent) : null;

  const traceId = parsed?.traceId || generateTraceId();
  const parentSpanId = parsed?.spanId || null;

  return runWithTraceContext(
    {
      traceId,
      parentSpanId,
    },
    async () => {
      const transitLatencyMs = meta?.sentAt ? Math.max(0, Date.now() - meta.sentAt) : undefined;
      return startSpan(
        `Socket: ${eventName}`,
        options?.kind || 'CONSUMER',
        {
          'messaging.system': 'websocket',
          'messaging.destination': meta?.room || 'broadcast',
          'messaging.event': eventName,
          ...(transitLatencyMs !== undefined ? { 'messaging.transit_latency_ms': transitLatencyMs } : {}),
          ...(options?.attributes || {}),
        },
        async (span) => {
          try {
            const result = await handler();
            span.status = { code: 'OK' };
            return result;
          } catch (err: any) {
            span.status = { code: 'ERROR', message: err?.message || String(err) };
            throw err;
          }
        }
      );
    }
  );
}
