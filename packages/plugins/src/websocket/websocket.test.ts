import { describe, it, expect } from 'vitest';
import { injectSocketTrace, extractSocketTrace, withSocketContext } from './index.js';
import { getActiveContext } from '@tracelens/core';

describe('WebSocket / Socket.io Tracing Plugin', () => {
  it('injects traceparent and metadata into socket payload', () => {
    const rawPayload = { message: 'hello chat', senderId: 'user_123' };
    const injected = injectSocketTrace(rawPayload, 'chat:message', 'room_room1');

    expect(injected.message).toBe('hello chat');
    expect(injected._tracelens).toBeDefined();
    expect(injected._tracelens.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(injected._tracelens.eventName).toBe('chat:message');
    expect(injected._tracelens.room).toBe('room_room1');
  });

  it('extracts socket trace from payload', () => {
    const raw = { data: 123 };
    expect(extractSocketTrace(raw)).toBeNull();

    const injected = injectSocketTrace(raw, 'test:event');
    const extracted = extractSocketTrace(injected);
    expect(extracted).not.toBeNull();
    expect(extracted?.eventName).toBe('test:event');
  });

  it('withSocketContext runs handler inside trace context and creates span', async () => {
    const payload = injectSocketTrace({ text: 'ping' }, 'ping');

    let capturedTraceId: string | undefined;
    let capturedSpanName: string | undefined;

    const result = await withSocketContext('ping', payload, async () => {
      const ctx = getActiveContext();
      capturedTraceId = ctx?.trace.id;
      capturedSpanName = ctx?.activeSpan.name;
      return 'pong';
    });

    expect(result).toBe('pong');
    expect(capturedTraceId).toBeDefined();
    expect(capturedSpanName).toBe('Socket: ping');
  });
});
