import { runWithTraceContext, startSpan } from '@tracelens/core';
import { generateTraceId, generateSpanId, parseTraceParent, formatTraceParent } from '@tracelens/protocol';
import type { SpanKind } from '@tracelens/protocol';

export interface TraceLensQueueMetadata {
  traceparent: string;
  enqueuedAt?: number;
  queueName?: string;
}

/**
 * Chèn distributed trace metadata vào payload trước khi gửi vào Queue (BullMQ, Kafka, RabbitMQ, SQS...)
 */
export function injectQueueTrace<T extends Record<string, any>>(payload: T, queueName?: string): T & { _tracelens: TraceLensQueueMetadata } {
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  const traceparent = formatTraceParent({ traceId, spanId });

  return {
    ...payload,
    _tracelens: {
      traceparent,
      enqueuedAt: Date.now(),
      queueName,
    },
  };
}

/**
 * Trích xuất trace metadata từ payload của job
 */
export function extractQueueTrace(payload: any): TraceLensQueueMetadata | null {
  if (payload && typeof payload === 'object' && payload._tracelens?.traceparent) {
    return payload._tracelens;
  }
  return null;
}

/**
 * Chạy Worker / Consumer xử lý job bên trong Trace Context tương ứng
 */
export async function withJobContext<T>(
  jobName: string,
  payload: any,
  handler: () => Promise<T>,
  options?: { kind?: SpanKind; attributes?: Record<string, any> }
): Promise<T> {
  const meta = extractQueueTrace(payload);
  const parsed = meta?.traceparent ? parseTraceParent(meta.traceparent) : null;

  const traceId = parsed?.traceId || generateTraceId();
  const parentSpanId = parsed?.spanId || null;

  return runWithTraceContext(
    {
      traceId,
      parentSpanId,
    },
    async () => {
      const waitTimeMs = meta?.enqueuedAt ? Math.max(0, Date.now() - meta.enqueuedAt) : undefined;
      return startSpan(
        `Job: ${jobName}`,
        options?.kind || 'CONSUMER',
        {
          'messaging.system': 'queue',
          'messaging.destination': meta?.queueName || 'default',
          'messaging.job_name': jobName,
          ...(waitTimeMs !== undefined ? { 'messaging.wait_time_ms': waitTimeMs } : {}),
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
