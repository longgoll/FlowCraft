import express, { type Express, type Request, type Response } from 'express';
import type { TraceHub } from '@tracelens/core';
import { toOpenTelemetryResourceSpans, toHar, toCurlCommand } from '@tracelens/protocol';
import crypto from 'node:crypto';
import { renderEmbeddedHtml } from './ui-template.js';


export function registerDashboardRoutes(app: Express, hub: TraceHub, endpoint = '/__lens'): void {
  // 1. SSE Realtime stream
  app.get(`${endpoint}/events`, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = crypto.randomUUID();
    hub.addClient(clientId, res);

    // Keep-alive heartbeat mỗi 15 giây
    const interval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
      hub.removeClient(clientId);
    });
  });

  // 2. API lấy danh sách traces
  app.get(`${endpoint}/api/traces`, (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: hub.getRecentTraces(),
    });
  });

  // 3. API lấy chi tiết 1 trace
  app.get(`${endpoint}/api/traces/:id`, (req: Request, res: Response) => {
    const traceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const trace = hub.getTraceById(traceId);
    if (!trace) {
      res.status(404).json({ success: false, error: 'Trace not found' });
      return;
    }
    res.json({ success: true, data: trace });
  });

  // 3b. API Export trace (OTel JSON / HAR / cURL)
  app.get(`${endpoint}/api/traces/:id/export`, (req: Request, res: Response) => {
    const traceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const format = (req.query.format as string) || 'json';
    const trace = hub.getTraceById(traceId);
    if (!trace) {
      res.status(404).json({ success: false, error: 'Trace not found' });
      return;
    }

    if (format === 'otel') {
      res.setHeader('Content-Disposition', `attachment; filename="trace-${traceId}-otel.json"`);
      res.json(toOpenTelemetryResourceSpans(trace));
      return;
    }

    if (format === 'har') {
      res.setHeader('Content-Disposition', `attachment; filename="trace-${traceId}.har"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(toHar(trace));
      return;
    }

    if (format === 'curl') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(toCurlCommand(trace));
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="trace-${traceId}.json"`);
    res.json(trace);
  });

  // 4. API Ingest trace từ các Microservices khác
  app.post(`${endpoint}/api/ingest`, express.json({ limit: '10mb' }), (req: Request, res: Response) => {
    const incomingTrace = req.body;
    if (incomingTrace && incomingTrace.id) {
      hub.ingestTrace(incomingTrace);
      res.json({ success: true, message: 'Trace ingested successfully' });
      return;
    }
    res.status(400).json({ success: false, error: 'Invalid trace payload' });
  });

  // 5. API xóa cache
  app.post(`${endpoint}/api/clear`, (_req: Request, res: Response) => {
    hub.clear();
    res.json({ success: true, message: 'Traces cleared' });
  });

  // 5. Serve Web UI
  app.get(endpoint, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderEmbeddedHtml(endpoint));
  });

  app.get(`${endpoint}/*`, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderEmbeddedHtml(endpoint));
  });
}
