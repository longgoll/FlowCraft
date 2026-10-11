import http from 'node:http';
import https from 'node:https';
import { startSpan, getActiveContext } from '@tracelens/core';
import { formatTraceParent } from '@tracelens/protocol';

let isNodeHttpPatched = false;
const TRACELENS_PROCESSED = Symbol('tracelens_http_processed');

export function resetNodeHttpInstrumentation(): void {
  isNodeHttpPatched = false;
}

/**
 * Tự động bọc `node:http` và `node:https`:
 * Bắt tất cả các client chạy trên HTTP gốc (Axios, Got, Superagent, request, native http.request)
 * và tự động chèn W3C traceparent header.
 */
export function instrumentNodeHttp(): void {
  if (isNodeHttpPatched) return;
  isNodeHttpPatched = true;

  patchModule(http);
  patchModule(https);
}

function patchModule(httpModule: typeof http | typeof https): void {
  const originalRequest = httpModule.request;

  (httpModule as any).request = function (...args: any[]) {
    const context = getActiveContext();
    if (!context) {
      return originalRequest.apply(this, args as any);
    }

    let url: string | URL = '';
    let options: http.RequestOptions = {};
    let cb: ((res: http.IncomingMessage) => void) | undefined;

    if (typeof args[0] === 'string' || args[0] instanceof URL) {
      url = args[0];
      if (typeof args[1] === 'object' && args[1] !== null) {
        options = { ...args[1] };
        cb = args[2];
      } else if (typeof args[1] === 'function') {
        cb = args[1];
      }
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      options = { ...args[0] };
      cb = args[1];
    }

    // Tránh xử lý 2 lần nếu đã có symbol hoặc là internal call của tracelens
    if ((options as any)[TRACELENS_PROCESSED]) {
      return originalRequest.apply(this, args as any);
    }
    (options as any)[TRACELENS_PROCESSED] = true;

    const method = (options.method || 'GET').toUpperCase();
    const protocol = (options as any).protocol || ((httpModule as any).globalAgent?.protocol) || 'http:';
    const host = options.hostname || options.host || (typeof url === 'string' && url.includes('://') ? new URL(url).hostname : 'localhost');
    const path = options.path || (typeof url === 'string' && url.includes('://') ? new URL(url).pathname : (url || '/'));

    // Bỏ qua nếu là request tới endpoint TraceLens Ingest/Events để tránh vòng lặp đệ quy
    const pathStr = String(path);
    if (pathStr.includes('/__lens/api/ingest') || pathStr.includes('/__lens/events')) {
      return originalRequest.apply(this, args as any);
    }

    const spanName = `HTTP ${method} ${host}${pathStr.split('?')[0]}`;

    return startSpan(
      spanName,
      'CLIENT',
      {
        'http.method': method,
        'http.host': String(host),
        'http.url': `${protocol}//${host}${pathStr}`,
        'component': 'node:http',
      },
      (span) => {
        // Tự động inject header W3C traceparent
        const traceParentValue = formatTraceParent({
          traceId: span.traceId,
          spanId: span.spanId,
        });

        if (!options.headers) {
          options.headers = {};
        }

        if (Array.isArray(options.headers)) {
          // Headers dạng array ['header-name', 'value']
          (options.headers as any).push('traceparent', traceParentValue);
        } else {
          (options.headers as any)['traceparent'] = traceParentValue;
        }

        // Tạo lại argument list
        let newArgs: any[];
        if (typeof args[0] === 'string' || args[0] instanceof URL) {
          newArgs = [url, options];
          if (cb) newArgs.push(cb);
        } else {
          newArgs = [options];
          if (cb) newArgs.push(cb);
        }

        const clientReq = originalRequest.apply(this, newArgs as any);

        clientReq.on('response', (res: http.IncomingMessage) => {
          const statusCode = res.statusCode || 200;
          span.attributes['http.status_code'] = statusCode;
          if (statusCode >= 400) {
            span.status = { code: 'ERROR', message: `HTTP ${statusCode}` };
          } else {
            span.status = { code: 'OK' };
          }
        });

        clientReq.on('error', (err: Error) => {
          span.status = { code: 'ERROR', message: err.message };
        });

        return clientReq;
      }
    );
  };
}
