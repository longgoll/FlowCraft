import type { Request, Response, NextFunction } from 'express';
import { startSpan, getActiveContext } from '@tracelens/core';

// Đánh dấu các hàm đã được bọc để tránh bọc lặp
const WRAPPED_SYMBOL = Symbol('__tracelens_wrapped__');

/**
 * Trích xuất tên có ý nghĩa cho middleware hoặc handler
 */
function getHandlerName(fn: Function, fallback = 'anonymousHandler'): string {
  if (fn.name && fn.name !== 'anonymous' && fn.name !== '<anonymous>') {
    return fn.name;
  }
  return fallback;
}

/**
 * Bọc một middleware đơn lẻ để đo thời gian chạy
 */
export function wrapMiddleware(fn: Function, layerName?: string): Function {
  if (!fn || typeof fn !== 'function') return fn;
  if ((fn as any)[WRAPPED_SYMBOL]) return fn;

  const originalFn = fn;
  const isErrorHandler = originalFn.length === 4;
  const displayName = layerName || getHandlerName(originalFn);

  let wrapped: Function;

  if (isErrorHandler) {
    wrapped = function (this: any, err: any, req: Request, res: Response, next: NextFunction) {
      if (!getActiveContext()) {
        return originalFn.call(this, err, req, res, next);
      }

      return startSpan(
        `[ErrorHandler] ${displayName}`,
        'INTERNAL',
        { 'express.component': 'error_middleware', 'error.type': err?.name || 'Error' },
        () => {
          let nextCalled = false;
          const interceptedNext = (...args: any[]) => {
            if (!nextCalled) {
              nextCalled = true;
            }
            return next.apply(this, args as any);
          };

          return originalFn.call(this, err, req, res, interceptedNext);
        }
      );
    };
  } else {
    wrapped = function (this: any, req: Request, res: Response, next: NextFunction) {
      if (!getActiveContext() || req.path?.startsWith('/__lens')) {
        return originalFn.call(this, req, res, next);
      }

      return startSpan(
        displayName,
        'INTERNAL',
        { 'express.component': 'middleware', 'http.method': req.method, 'http.path': req.path },
        () => {
          let nextCalled = false;
          const interceptedNext = (...args: any[]) => {
            if (!nextCalled) {
              nextCalled = true;
            }
            return next.apply(this, args as any);
          };

          return originalFn.call(this, req, res, interceptedNext);
        }
      );
    };
  }

  (wrapped as any)[WRAPPED_SYMBOL] = true;
  return wrapped;
}

/**
 * Patch toàn bộ các Layer trong một stack (router hoặc app)
 */
export function patchRouterStack(stack: any[]): void {
  if (!Array.isArray(stack)) return;

  for (const layer of stack) {
    if (!layer) continue;

    // Nếu layer có handle và chưa được bọc
    if (layer.handle && !(layer.handle as any)[WRAPPED_SYMBOL]) {
      const name = layer.name === '<anonymous>' ? undefined : layer.name;
      layer.handle = wrapMiddleware(layer.handle, name);
    }

    // Nếu layer là một sub-router (nested router)
    if (layer.route?.stack) {
      patchRouterStack(layer.route.stack);
    }
  }
}
