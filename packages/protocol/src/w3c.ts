import crypto from 'node:crypto';

export interface TraceContext {
  version: string;
  traceId: string;
  spanId: string;
  traceFlags: string;
}

const TRACE_PARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

/**
 * Sinh TraceId chuẩn 16-byte (32 ký tự hex)
 */
export function generateTraceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Sinh SpanId chuẩn 8-byte (16 ký tự hex)
 */
export function generateSpanId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Parse header `traceparent` theo chuẩn W3C
 * Ví dụ: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */
export function parseTraceParent(header?: string | null): TraceContext | null {
  if (!header) return null;
  const match = header.trim().match(TRACE_PARENT_REGEX);
  if (!match) return null;

  const [, version, traceId, spanId, traceFlags] = match;

  // W3C spec: all zeroes is invalid
  if (traceId === '00000000000000000000000000000000' || spanId === '0000000000000000') {
    return null;
  }

  return {
    version,
    traceId,
    spanId,
    traceFlags,
  };
}

/**
 * Format thành chuỗi W3C `traceparent`
 */
export function formatTraceParent(context: Pick<TraceContext, 'traceId' | 'spanId'> & { version?: string; traceFlags?: string }): string {
  const version = context.version || '00';
  const flags = context.traceFlags || '01';
  return `${version}-${context.traceId}-${context.spanId}-${flags}`;
}
