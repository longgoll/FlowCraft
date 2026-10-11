import { describe, it, expect, vi } from 'vitest';
import { TraceHub } from './hub.js';
import type { TraceRecord } from '@tracelens/protocol';
import type { ServerResponse } from 'node:http';

describe('TraceHub', () => {
  const createMockTrace = (id: string): TraceRecord => ({
    id,
    rootSpanId: 'root_' + id,
    name: 'GET /test',
    timestamp: Date.now(),
    durationMs: 10,
    status: { code: 'OK' },
    spans: [
      {
        traceId: id,
        spanId: 'root_' + id,
        parentSpanId: null,
        name: 'root',
        kind: 'SERVER',
        startTime: Date.now(),
        endTime: Date.now() + 10,
        durationMs: 10,
        status: { code: 'OK' },
        attributes: {},
      },
    ],
  });

  it('should record trace and retrieve recent traces', () => {
    const hub = new TraceHub(10);
    const trace = createMockTrace('tr_1');
    hub.recordTrace(trace);

    expect(hub.getRecentTraces()).toHaveLength(1);
    expect(hub.getTraceById('tr_1')).toEqual(trace);
  });

  it('should ingest and merge distributed spans from secondary service', () => {
    const hub = new TraceHub(10);
    const traceA = createMockTrace('tr_distributed');
    hub.recordTrace(traceA);

    // Microservice B produces span on the same trace
    const incomingFromB: TraceRecord = {
      id: 'tr_distributed',
      rootSpanId: 'span_b1',
      serviceName: 'Inventory Microservice',
      name: 'POST /inventory/deduct',
      timestamp: Date.now(),
      durationMs: 25,
      status: { code: 'OK' },
      spans: [
        {
          traceId: 'tr_distributed',
          spanId: 'span_b1',
          parentSpanId: 'root_tr_distributed',
          serviceName: 'Inventory Microservice',
          name: 'db.inventory.query',
          kind: 'CLIENT',
          startTime: Date.now(),
          endTime: Date.now() + 15,
          durationMs: 15,
          status: { code: 'OK' },
          attributes: {},
        },
      ],
    };

    hub.ingestTrace(incomingFromB);

    const merged = hub.getTraceById('tr_distributed');
    expect(merged).toBeDefined();
    expect(merged?.spans).toHaveLength(2);
    expect(merged?.durationMs).toBe(25);
  });

  it('should broadcast events to connected SSE clients', () => {
    const hub = new TraceHub(10);
    const mockRes = {
      write: vi.fn(),
    } as unknown as ServerResponse;

    hub.addClient('client_1', mockRes);
    expect(mockRes.write).toHaveBeenCalledTimes(2); // welcome + traces:init

    const trace = createMockTrace('tr_sse');
    hub.recordTrace(trace);
    expect(mockRes.write).toHaveBeenCalledTimes(3);

    hub.removeClient('client_1');
    hub.recordTrace(createMockTrace('tr_sse_2'));
    expect(mockRes.write).toHaveBeenCalledTimes(3); // no new write after remove
  });
});
