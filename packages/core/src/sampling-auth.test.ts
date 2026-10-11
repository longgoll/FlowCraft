import { describe, it, expect } from 'vitest';
import { Sampler } from './sampling.js';
import { verifyDashboardAuth } from './auth.js';
import type { TraceRecord } from '@tracelens/protocol';

describe('Sampler', () => {
  it('samples 100% when sampleRate is 1.0 or undefined', () => {
    const sampler = new Sampler();
    expect(sampler.shouldSampleHead()).toBe(true);
  });

  it('samples 0% on head when sampleRate is 0', () => {
    const sampler = new Sampler({ sampleRate: 0 });
    expect(sampler.shouldSampleHead()).toBe(false);
  });

  it('tail samples errors even if head sampled false', () => {
    const sampler = new Sampler({ sampleRate: 0, alwaysSampleErrors: true });
    const errorTrace: TraceRecord = {
      id: 'trace-1',
      rootSpanId: 'span-1',
      name: 'GET /api/test',
      timestamp: Date.now(),
      durationMs: 45,
      status: { code: 'ERROR' },
      spans: [],
      http: { statusCode: 500, method: 'GET', url: '/api/test', path: '/api/test' },
    };

    expect(sampler.shouldKeepTrace(errorTrace, false)).toBe(true);
  });

  it('tail samples slow requests exceeding threshold', () => {
    const sampler = new Sampler({ sampleRate: 0, slowLatencyThresholdMs: 300 });
    const fastTrace: TraceRecord = {
      id: 'trace-fast',
      rootSpanId: 'span-1',
      name: 'GET /fast',
      timestamp: Date.now(),
      durationMs: 50,
      status: { code: 'OK' },
      spans: [],
      http: { statusCode: 200, method: 'GET', url: '/fast', path: '/fast' },
    };

    const slowTrace: TraceRecord = {
      id: 'trace-slow',
      rootSpanId: 'span-2',
      name: 'GET /slow',
      timestamp: Date.now(),
      durationMs: 450,
      status: { code: 'OK' },
      spans: [],
      http: { statusCode: 200, method: 'GET', url: '/slow', path: '/slow' },
    };

    expect(sampler.shouldKeepTrace(fastTrace, false)).toBe(false);
    expect(sampler.shouldKeepTrace(slowTrace, false)).toBe(true);
  });
});

describe('verifyDashboardAuth', () => {
  it('allows access when no auth options configured', () => {
    expect(verifyDashboardAuth({})).toBe(true);
  });

  it('validates Bearer token in headers or query', () => {
    const opts = { token: 'secret-token-123' };
    expect(verifyDashboardAuth({ headers: { authorization: 'Bearer secret-token-123' } }, opts)).toBe(true);
    expect(verifyDashboardAuth({ query: { token: 'secret-token-123' } }, opts)).toBe(true);
    expect(verifyDashboardAuth({ headers: { authorization: 'Bearer wrong' } }, opts)).toBe(false);
  });

  it('validates HTTP Basic Auth', () => {
    const opts = { username: 'admin', password: 'password123' };
    const basicToken = Buffer.from('admin:password123').toString('base64');
    expect(verifyDashboardAuth({ headers: { authorization: `Basic ${basicToken}` } }, opts)).toBe(true);

    const wrongToken = Buffer.from('admin:wrong').toString('base64');
    expect(verifyDashboardAuth({ headers: { authorization: `Basic ${wrongToken}` } }, opts)).toBe(false);
  });

  it('supports custom validator', () => {
    const opts = {
      validate: (ctx: any) => ctx.headers?.['x-api-key'] === 'my-key',
    };
    expect(verifyDashboardAuth({ headers: { 'x-api-key': 'my-key' } }, opts)).toBe(true);
    expect(verifyDashboardAuth({ headers: { 'x-api-key': 'invalid' } }, opts)).toBe(false);
  });
});
