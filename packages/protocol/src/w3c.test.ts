import { describe, it, expect } from 'vitest';
import { generateTraceId, generateSpanId, formatTraceParent, parseTraceParent } from './w3c.js';

describe('W3C TraceContext', () => {
  it('should generate valid 32-character hex traceId', () => {
    const traceId = generateTraceId();
    expect(traceId).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);
  });

  it('should generate valid 16-character hex spanId', () => {
    const spanId = generateSpanId();
    expect(spanId).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true);
  });

  it('should format traceparent correctly', () => {
    const formatted = formatTraceParent({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
    });
    expect(formatted).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  });

  it('should parse valid traceparent string', () => {
    const header = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const parsed = parseTraceParent(header);

    expect(parsed).toEqual({
      version: '00',
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceFlags: '01',
    });
  });

  it('should return null for invalid or all-zero IDs per W3C specification', () => {
    expect(parseTraceParent(null)).toBeNull();
    expect(parseTraceParent('')).toBeNull();
    expect(parseTraceParent('invalid-header')).toBeNull();
    expect(parseTraceParent('00-00000000000000000000000000000000-00f067aa0ba902b7-01')).toBeNull();
    expect(parseTraceParent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01')).toBeNull();
  });
});
