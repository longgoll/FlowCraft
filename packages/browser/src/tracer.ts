import { generateTraceId, generateSpanId, formatTraceParent } from '@tracelens/protocol';

export interface BrowserTracingOptions {
  serviceName?: string;
  propagateTraceHeader?: boolean;
  captureErrors?: boolean;
  captureNavigationTiming?: boolean;
}

export interface ActionContext {
  component?: string;
  action?: string;
}

export interface ClientErrorInfo {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
}

let activeActionContext: ActionContext | null = null;
let currentServiceName = 'React Web App';
let isInitialized = false;
const recentErrors: ClientErrorInfo[] = [];

/**
 * Thu thập hiệu năng tải trang (Navigation Performance)
 */
export function getNavigationPerformance(): Record<string, number> | undefined {
  if (typeof window === 'undefined' || typeof window.performance === 'undefined') {
    return undefined;
  }

  const navEntries = window.performance.getEntriesByType?.('navigation');
  if (navEntries && navEntries.length > 0) {
    const nav = navEntries[0] as PerformanceNavigationTiming;
    return {
      dnsMs: Math.max(0, Math.round(nav.domainLookupEnd - nav.domainLookupStart)),
      tcpMs: Math.max(0, Math.round(nav.connectEnd - nav.connectStart)),
      ttfbMs: Math.max(0, Math.round(nav.responseStart - nav.requestStart)),
      domInteractiveMs: Math.max(0, Math.round(nav.domInteractive - nav.startTime)),
      loadMs: Math.max(0, Math.round(nav.loadEventEnd - nav.startTime)),
    };
  }

  return undefined;
}

/**
 * Tạo headers W3C traceparent và x-tracelens-client thủ công
 * Tiện lợi khi dùng với Apollo Client GraphQL, Axios instance riêng hoặc WebSocket
 */
export function createTraceHeaders(componentName?: string, actionName?: string): Record<string, string> {
  const traceId = generateTraceId();
  const spanId = generateSpanId();

  const clientMeta = {
    service: currentServiceName,
    component: componentName || activeActionContext?.component || 'WebComponent',
    action: actionName || activeActionContext?.action || 'UserAction',
    url: typeof window !== 'undefined' ? window.location.href : '',
    recentErrors: recentErrors.length > 0 ? recentErrors.slice(-3) : undefined,
    performance: getNavigationPerformance(),
  };

  return {
    traceparent: formatTraceParent({ traceId, spanId }),
    'x-tracelens-client': JSON.stringify(clientMeta),
  };
}

/**
 * Khởi tạo tự động TraceLens trên trình duyệt Web (React, Vue, Next.js, Vanilla JS)
 */
export function initBrowserTracing(options: BrowserTracingOptions = {}): void {
  if (isInitialized || typeof window === 'undefined') return;

  currentServiceName = options.serviceName || 'React Web App';
  const propagateHeader = options.propagateTraceHeader !== false;
  const captureErrors = options.captureErrors !== false;

  // 1. Lắng nghe lỗi unhandled trên trình duyệt
  if (captureErrors) {
    window.addEventListener('error', (event) => {
      recentErrors.push({
        message: event.message || 'Unknown browser error',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
      });
      if (recentErrors.length > 10) recentErrors.shift();
    });

    window.addEventListener('unhandledrejection', (event) => {
      recentErrors.push({
        message: event.reason instanceof Error ? event.reason.message : String(event.reason || 'Unhandled Promise Rejection'),
        timestamp: Date.now(),
      });
      if (recentErrors.length > 10) recentErrors.shift();
    });
  }

  // 2. Monkey patch window.fetch
  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const headers = new Headers(init?.headers);

      if (propagateHeader) {
        const traceHeaders = createTraceHeaders();
        for (const [k, v] of Object.entries(traceHeaders)) {
          headers.set(k, v);
        }
      }

      const modifiedInit: RequestInit = {
        ...init,
        headers,
      };

      return originalFetch.call(this, input, modifiedInit);
    };
  }

  // 3. Monkey patch XMLHttpRequest (Hỗ trợ Axios, jQuery, XHR clients)
  if (typeof window.XMLHttpRequest === 'function') {
    const originalOpen = window.XMLHttpRequest.prototype.open;
    const originalSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      (this as any)._tracelens_url = String(url);
      return (originalOpen as any).apply(this, [method, url, ...rest]);
    };

    window.XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      if (propagateHeader) {
        try {
          const traceHeaders = createTraceHeaders();
          for (const [k, v] of Object.entries(traceHeaders)) {
            this.setRequestHeader(k, v);
          }
        } catch {
          // Bỏ qua nếu XHR đang ở state không thể setHeader
        }
      }
      return originalSend.call(this, body);
    };
  }

  isInitialized = true;
  console.log(
    `%c[TraceLens Browser]%c SDK initialized for ${currentServiceName} (Fetch + XHR / Axios + Error Tracking)`,
    'color: #6366F1; font-weight: bold;',
    'color: inherit;'
  );
}

/**
 * Bọc một hành động người dùng (ví dụ: click nút, submit form)
 */
export async function traceAction<T>(
  actionName: string,
  componentName: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const previousContext = activeActionContext;
  activeActionContext = {
    action: actionName,
    component: componentName,
  };

  try {
    return await fn();
  } finally {
    activeActionContext = previousContext;
  }
}

/**
 * Tiện ích React Hook: trả về hàm thực thi hành động người dùng gắn nhãn component
 */
export function useTraceAction(componentName: string) {
  return function runAction<T>(actionName: string, fn: () => Promise<T> | T): Promise<T> {
    return traceAction(actionName, componentName, fn);
  };
}

/**
 * Higher-order function bọc Event Handler (ví dụ onClick, onSubmit)
 */
export function withTraceAction<Args extends any[], ReturnType>(
  componentName: string,
  actionName: string,
  fn: (...args: Args) => ReturnType
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    return traceAction(actionName, componentName, () => fn(...args));
  };
}
