import type { Express } from 'express';
import express from 'express';
import { TraceHub, step } from '@tracelens/core';
import type { TraceLensInitOptions } from '@tracelens/protocol';
import { createTraceMiddleware } from './middleware.js';
import { registerDashboardRoutes } from './dashboard-routes.js';
import { wrapMiddleware, patchRouterStack } from './patcher.js';

import {
  enableAutoPlugins,
  attachPrismaTracing,
  tracelensPrismaExtension,
  instrumentRedis,
  instrumentPg,
  instrumentMysql,
  instrumentMongoose,
} from '@tracelens/plugins';

export * from '@tracelens/protocol';
export * from '@tracelens/core';
export * from '@tracelens/plugins';
export { wrapMiddleware } from './patcher.js';

export class TraceLens {
  private hub: TraceHub | null = null;
  private initialized = false;

  // Plugin helpers
  public attachPrismaTracing = attachPrismaTracing;
  public tracelensPrismaExtension = tracelensPrismaExtension;
  public instrumentRedis = instrumentRedis;
  public instrumentPg = instrumentPg;
  public instrumentMysql = instrumentMysql;
  public instrumentMongoose = instrumentMongoose;
  public step = step;

  init(app: Express, options: TraceLensInitOptions = {}): TraceHub {
    if (this.initialized && this.hub) {
      return this.hub;
    }

    const endpoint = options.endpoint || '/__lens';
    const maxHistory = options.maxHistory || 100;
    this.hub = new TraceHub(maxHistory);

    // Kích hoạt toàn bộ auto-detection plugins (Fetch, DB, Cache...)
    enableAutoPlugins();

    // 1. Gắn Trace Dashboard endpoints trước
    registerDashboardRoutes(app, this.hub, endpoint);

    // 2. Gắn Root Tracing Middleware
    app.use(createTraceMiddleware(this.hub, options));

    // 3. Monkey-patch express.Router.prototype.use để tự động bọc bất kỳ middleware/router nào thêm vào
    const originalRouterUse = express.Router.prototype.use;
    (express.Router.prototype as any).use = function (...args: any[]) {
      const wrappedArgs = args.map((arg) => {
        if (typeof arg === 'function') {
          return wrapMiddleware(arg);
        }
        return arg;
      });
      return originalRouterUse.apply(this, wrappedArgs as any);
    };

    // Monkey-patch các HTTP method trên Router
    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
    for (const method of methods) {
      const originalMethod = (express.Router.prototype as any)[method];
      if (originalMethod) {
        (express.Router.prototype as any)[method] = function (...args: any[]) {
          const wrappedArgs = args.map((arg) => {
            if (typeof arg === 'function') {
              return wrapMiddleware(arg);
            }
            return arg;
          });
          return originalMethod.apply(this, wrappedArgs as any);
        };
      }
    }

    // Nếu app đã có routes được gắn từ trước, duyệt stack để patch
    if ((app as any)._router?.stack) {
      patchRouterStack((app as any)._router.stack);
    }

    this.initialized = true;
    console.log(`\x1b[35m[TraceLens]\x1b[0m 🚀 In-App Inspector initialized: http://localhost:${process.env.PORT || 3000}${endpoint}`);

    return this.hub;
  }
}

export const tracelens = new TraceLens();
export default tracelens;
