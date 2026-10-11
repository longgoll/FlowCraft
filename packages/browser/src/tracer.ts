import { generateTraceId, generateSpanId, formatTraceParent } from '@tracelens/protocol';

export interface BrowserTracingOptions {
  serviceName?: string;
  propagateTraceHeader?: boolean;
}

export interface ActionContext {
  component?: string;
  action?: string;
}

let activeActionContext: ActionContext | null = null;
let isInitialized = false;

/**
 * Khởi tạo tự động TraceLens trên trình duyệt Web (React, Vue, Vanilla)
 */
export function initBrowserTracing(options: BrowserTracingOptions = {}): void {
  if (isInitialized || typeof window === 'undefined') return;

  const serviceName = options.serviceName || 'React Web App';
  const propagateHeader = options.propagateTraceHeader !== false;

  // 1. Monkey patch window.fetch
  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const traceId = generateTraceId();
      const spanId = generateSpanId();

      const headers = new Headers(init?.headers);

      if (propagateHeader) {
        // Gắn header W3C
        headers.set('traceparent', formatTraceParent({ traceId, spanId }));

        // Gắn thông tin Client metadata để Backend hiển thị
        const clientMeta = {
          service: serviceName,
          component: activeActionContext?.component || 'WebComponent',
          action: activeActionContext?.action || 'UserAction',
          url: window.location.href,
        };
        headers.set('x-tracelens-client', JSON.stringify(clientMeta));
      }

      const modifiedInit: RequestInit = {
        ...init,
        headers,
      };

      return originalFetch.call(this, input, modifiedInit);
    };
  }

  isInitialized = true;
  console.log(`%c[TraceLens Browser]%c SDK initialized for ${serviceName}`, 'color: #6366F1; font-weight: bold;', 'color: inherit;');
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
