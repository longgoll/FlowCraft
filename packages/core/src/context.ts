import { AsyncLocalStorage } from 'node:async_hooks';
import type { SpanData, TraceRecord, SpanLog } from '@tracelens/protocol';
import { generateTraceId, generateSpanId } from '@tracelens/protocol';

export interface TraceContextState {
  trace: TraceRecord;
  activeSpan: SpanData;
  spanStack: SpanData[];
}

export const traceStorage = new AsyncLocalStorage<TraceContextState>();

/**
 * Lấy state hiện tại trong async context
 */
export function getActiveContext(): TraceContextState | undefined {
  return traceStorage.getStore();
}

/**
 * Bọc một bước nghiệp vụ nội bộ (Business Step / Logic phase)
 */
export function step<T>(name: string, fn: (span: SpanData) => T): T {
  return startSpan(name, 'INTERNAL', { 'component': 'business_step' }, fn);
}

/**
 * Lấy active span hiện tại
 */
export function getActiveSpan(): SpanData | undefined {
  return traceStorage.getStore()?.activeSpan;
}

/**
 * Ghi log trực tiếp gắn liền vào Active Span hiện tại
 */
export function addLog(
  level: SpanLog['level'],
  message: string,
  attributes?: Record<string, unknown>
): void {
  const span = getActiveSpan();
  if (!span) return;
  if (!span.logs) {
    span.logs = [];
  }
  span.logs.push({
    timestamp: Date.now(),
    level,
    message,
    attributes,
  });
}

let consoleCaptureEnabled = false;

/**
 * Tự động bọc console.log/info/warn/error để gắn log vào Active Span
 */
export function enableConsoleCapture(): void {
  if (consoleCaptureEnabled) return;
  consoleCaptureEnabled = true;

  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  const formatArgs = (args: any[]) =>
    args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

  console.log = function (...args: any[]) {
    addLog('info', formatArgs(args));
    return originalLog.apply(this, args);
  };

  console.info = function (...args: any[]) {
    addLog('info', formatArgs(args));
    return originalInfo.apply(this, args);
  };

  console.warn = function (...args: any[]) {
    addLog('warn', formatArgs(args));
    return originalWarn.apply(this, args);
  };

  console.error = function (...args: any[]) {
    addLog('error', formatArgs(args));
    return originalError.apply(this, args);
  };
}

/**
 * Tạo và bọc một child span mới trong context
 */
export function startSpan<T>(
  name: string,
  kind: SpanData['kind'] = 'INTERNAL',
  attributes: Record<string, unknown> = {},
  fn: (span: SpanData) => T
): T {
  const current = getActiveContext();
  if (!current) {
    // Không có trace context thì chạy hàm trực tiếp
    return fn({} as SpanData);
  }

  const spanId = generateSpanId();
  const startTime = Date.now();

  const childSpan: SpanData = {
    traceId: current.trace.id,
    spanId,
    parentSpanId: current.activeSpan.spanId,
    name,
    kind,
    startTime,
    endTime: startTime,
    durationMs: 0,
    status: { code: 'UNSET' },
    attributes,
    events: [],
  };

  // Đăng ký span vào danh sách của trace
  current.trace.spans.push(childSpan);

  const nextState: TraceContextState = {
    trace: current.trace,
    activeSpan: childSpan,
    spanStack: [...current.spanStack, childSpan],
  };

  const endSpan = (error?: unknown) => {
    childSpan.endTime = Date.now();
    childSpan.durationMs = Math.max(0.1, Number((childSpan.endTime - childSpan.startTime).toFixed(2)));
    if (error) {
      childSpan.status = {
        code: 'ERROR',
        message: error instanceof Error ? error.message : String(error),
      };
    } else {
      childSpan.status = { code: 'OK' };
    }
  };

  return traceStorage.run(nextState, () => {
    try {
      const result = fn(childSpan);
      if (result instanceof Promise) {
        return (result as Promise<unknown>)
          .then((res) => {
            endSpan();
            return res;
          })
          .catch((err) => {
            endSpan(err);
            throw err;
          }) as unknown as T;
      }
      endSpan();
      return result;
    } catch (err) {
      endSpan(err);
      throw err;
    }
  });
}

/**
 * Khởi tạo một Trace Context mới và chạy callback bên trong context đó
 */
export function runWithTraceContext<T>(
  options: {
    traceId?: string;
    parentSpanId?: string | null;
    name?: string;
    kind?: SpanData['kind'];
    attributes?: Record<string, unknown>;
  },
  fn: () => T
): T {
  const traceId = options.traceId || generateTraceId();
  const rootSpanId = options.parentSpanId || generateSpanId();
  const now = Date.now();

  const rootSpan: SpanData = {
    traceId,
    spanId: rootSpanId,
    parentSpanId: null,
    name: options.name || 'root',
    kind: options.kind || 'SERVER',
    startTime: now,
    endTime: now,
    durationMs: 0,
    status: { code: 'UNSET' },
    attributes: options.attributes || {},
    events: [],
  };

  const trace: TraceRecord = {
    id: traceId,
    rootSpanId,
    name: options.name || 'root',
    timestamp: now,
    durationMs: 0,
    status: { code: 'UNSET' },
    spans: [rootSpan],
  };

  const state: TraceContextState = {
    trace,
    activeSpan: rootSpan,
    spanStack: [rootSpan],
  };

  return traceStorage.run(state, fn);
}

