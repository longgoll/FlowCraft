import { startSpan, getActiveContext } from '@tracelens/core';
import { formatTraceParent } from '@tracelens/protocol';

let isFetchPatched = false;

export function resetFetchInstrumentation(): void {
  isFetchPatched = false;
}

/**
 * Tự động bọc global `fetch` của Node.js:
 * 1. Đo thời gian gọi API bên ngoài (Stripe, OpenAI, Microservice khác...)
 * 2. Tự động chèn header W3C `traceparent` để microservice nhận được trace
 */
export function instrumentFetch(force = false): void {
  if ((isFetchPatched && !force) || typeof globalThis.fetch !== 'function') return;


  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const context = getActiveContext();
    if (!context) {
      // Nếu không nằm trong trace context, chạy fetch bình thường
      return originalFetch(input, init);
    }

    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let urlObj: URL | null = null;
    try {
      urlObj = new URL(urlString);
    } catch {
      // relative or custom url
    }

    const method = (init?.method || (typeof input === 'object' && 'method' in input && input.method) || 'GET').toUpperCase();
    const hostname = urlObj?.hostname || 'external';
    const spanName = `HTTP ${method} ${hostname}${urlObj?.pathname || ''}`;

    return startSpan(
      spanName,
      'CLIENT',
      {
        'http.method': method,
        'http.url': urlString,
        'http.host': hostname,
        'component': 'fetch',
      },
      async (span) => {
        // Tự động inject header W3C `traceparent` cho microservice
        const headers = new Headers(init?.headers);
        const traceParentValue = formatTraceParent({
          traceId: span.traceId,
          spanId: span.spanId,
        });
        headers.set('traceparent', traceParentValue);

        const modifiedInit: RequestInit = {
          ...init,
          headers,
        };

        try {
          const response = await originalFetch(input, modifiedInit);
          span.attributes['http.status_code'] = response.status;
          if (response.status >= 400) {
            span.status = { code: 'ERROR', message: `HTTP ${response.status}` };
          } else {
            span.status = { code: 'OK' };
          }
          return response;
        } catch (error) {
          span.status = {
            code: 'ERROR',
            message: error instanceof Error ? error.message : String(error),
          };
          throw error;
        }
      }
    );
  };

  isFetchPatched = true;
}
