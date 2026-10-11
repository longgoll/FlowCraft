import type { TraceRecord } from '@tracelens/protocol';
import { RingBuffer } from './ring-buffer.js';
import type { ServerResponse } from 'node:http';

export interface SSEClient {
  id: string;
  res: ServerResponse;
}

import type { OtlpHttpExporter } from './exporter.js';

export class TraceHub {
  private buffer: RingBuffer<TraceRecord>;
  private sseClients: Map<string, ServerResponse> = new Map();
  private exporter?: OtlpHttpExporter;

  constructor(maxHistory = 100) {
    this.buffer = new RingBuffer<TraceRecord>(maxHistory);
  }

  private webhookAlertUrl?: string;

  setExporter(exporter: OtlpHttpExporter): void {
    this.exporter = exporter;
  }

  setWebhookAlertUrl(url?: string): void {
    this.webhookAlertUrl = url;
  }

  /**
   * Lưu trace hoàn thành và broadcast tới tất cả SSE clients
   */
  recordTrace(trace: TraceRecord): void {
    this.buffer.push(trace);
    this.broadcast('trace:new', trace);
    this.exporter?.enqueue(trace);

    // Gửi Webhook alert (Slack/Discord/Telegram) nếu trace bị lỗi
    if (this.webhookAlertUrl && trace.status.code === 'ERROR') {
      try {
        fetch(this.webhookAlertUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 [TraceLens Alert] Error detected on ${trace.serviceName || 'Service'}: ${trace.name} - ${trace.status.message || 'Unknown error'}`,
            traceId: trace.id,
            durationMs: trace.durationMs,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  /**
   * Nhận Spans từ một Microservice khác đẩy về và gộp vào Trace có cùng traceId
   */
  ingestTrace(incoming: TraceRecord): void {
    const existing = this.buffer.find((t) => t.id === incoming.id);
    if (existing) {
      for (const span of incoming.spans) {
        if (!existing.spans.some((s) => s.spanId === span.spanId)) {
          existing.spans.push(span);
        }
      }
      existing.durationMs = Math.max(existing.durationMs, incoming.durationMs);
      this.broadcast('trace:update', existing);
    } else {
      this.recordTrace(incoming);
    }
  }

  getRecentTraces(): TraceRecord[] {
    return this.buffer.getAll();
  }

  getTraceById(id: string): TraceRecord | undefined {
    return this.buffer.find((t) => t.id === id);
  }

  clear(): void {
    this.buffer.clear();
    this.broadcast('trace:clear', {});
  }

  /**
   * Đăng ký một client SSE
   */
  addClient(id: string, res: ServerResponse): void {
    this.sseClients.set(id, res);

    // Gửi event chào mừng và batch trace gần nhất
    const welcome = `event: connected\ndata: ${JSON.stringify({ clientId: id, timestamp: Date.now() })}\n\n`;
    res.write(welcome);

    const initialData = `event: traces:init\ndata: ${JSON.stringify(this.getRecentTraces())}\n\n`;
    res.write(initialData);
  }

  removeClient(id: string): void {
    this.sseClients.delete(id);
  }

  private broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.sseClients.entries()) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(id);
      }
    }
  }
}
