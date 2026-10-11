import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initBrowserTracing,
  traceAction,
  useTraceAction,
  withTraceAction,
  createTraceHeaders,
} from './tracer.js';

describe('TraceLens Browser SDK', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates trace headers with valid W3C traceparent and client metadata', () => {
    const headers = createTraceHeaders('CheckoutBtn', 'ClickPay');
    expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(headers['x-tracelens-client']).toBeDefined();

    const meta = JSON.parse(headers['x-tracelens-client']);
    expect(meta.component).toBe('CheckoutBtn');
    expect(meta.action).toBe('ClickPay');
  });

  it('traceAction sets and restores context correctly', async () => {
    let capturedMeta: any = null;

    await traceAction('SubmitForm', 'LoginForm', async () => {
      const headers = createTraceHeaders();
      capturedMeta = JSON.parse(headers['x-tracelens-client']);
    });

    expect(capturedMeta.action).toBe('SubmitForm');
    expect(capturedMeta.component).toBe('LoginForm');

    // Context should be restored
    const defaultHeaders = createTraceHeaders();
    const defaultMeta = JSON.parse(defaultHeaders['x-tracelens-client']);
    expect(defaultMeta.component).toBe('WebComponent');
  });

  it('useTraceAction helper runs action properly', async () => {
    const runInCart = useTraceAction('CartComponent');
    const result = await runInCart('RemoveItem', async () => {
      const headers = createTraceHeaders();
      const meta = JSON.parse(headers['x-tracelens-client']);
      expect(meta.component).toBe('CartComponent');
      expect(meta.action).toBe('RemoveItem');
      return 42;
    });

    expect(result).toBe(42);
  });

  it('withTraceAction HOF wraps event handler', async () => {
    const handler = vi.fn((amount: number) => `paid ${amount}`);
    const wrappedHandler = withTraceAction('PaymentModal', 'ProcessPayment', handler);

    const res = await wrappedHandler(100);
    expect(res).toBe('paid 100');
    expect(handler).toHaveBeenCalledWith(100);
  });
});
