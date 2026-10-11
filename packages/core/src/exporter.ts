import type { TraceRecord } from '@tracelens/protocol';
import { toOtlpJson } from '@tracelens/protocol';

export interface OtlpExporterOptions {
  endpoint: string; // e.g. http://localhost:4318/v1/traces
  headers?: Record<string, string>;
  batchSize?: number;
  flushIntervalMs?: number;
  serviceName?: string;
}

/**
 * Background OTLP Exporter: Tự động gom batch và gửi traces tới Jaeger / SigNoz / OpenTelemetry Collector
 */
export class OtlpHttpExporter {
  private queue: TraceRecord[] = [];
  private timer: NodeJS.Timeout | null = null;
  private endpoint: string;
  private headers: Record<string, string>;
  private batchSize: number;
  private flushIntervalMs: number;

  constructor(options: OtlpExporterOptions) {
    this.endpoint = options.endpoint;
    this.headers = options.headers || {};
    this.batchSize = options.batchSize || 10;
    this.flushIntervalMs = options.flushIntervalMs || 2000;

    this.timer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.flushIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  enqueue(trace: TraceRecord): void {
    this.queue.push(trace);
    if (this.queue.length >= this.batchSize) {
      this.flush().catch(() => {});
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);

    try {
      const resourceSpans = batch.flatMap((trace) => toOtlpJson(trace).resourceSpans);
      const payload = { resourceSpans };

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // An toàn: Không để lỗi collector làm gián đoạn tiến trình Node chính
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush().catch(() => {});
  }
}
