import { describe, it, expect, vi } from 'vitest';
import { TraceLensModule, TraceSpan, TraceLensInterceptor } from './index.js';
import { runWithTraceContext, getActiveContext } from '@tracelens/core';

class MockUserService {
  async findUserById(id: string) {
    return { id, name: 'Alice' };
  }
}

const methodDesc = Object.getOwnPropertyDescriptor(MockUserService.prototype, 'findUserById')!;
TraceSpan('UserService.findUserById', 'INTERNAL', { 'user.role': 'admin' })(
  MockUserService.prototype,
  'findUserById',
  methodDesc
);
Object.defineProperty(MockUserService.prototype, 'findUserById', methodDesc);

describe('@tracelens/nestjs', () => {
  it('TraceLensModule khởi tạo provider và TraceHub', () => {
    const mod = TraceLensModule.forRoot({ serviceName: 'test-nest', maxHistory: 50 });
    expect(mod.providers).toBeDefined();
    expect(mod.exports).toContain(TraceLensInterceptor);

    const hub = TraceLensModule.getHub();
    expect(hub).toBeDefined();
  });

  it('@TraceSpan decorator tự động bọc method và tạo child span', async () => {
    const service = new MockUserService();

    await runWithTraceContext({ traceId: '4bf92f3577b34da6a3ce929d0e0e4736' }, async () => {
      const user = await service.findUserById('usr_42');
      expect(user.name).toBe('Alice');

      const ctx = getActiveContext();
      expect(ctx?.trace.spans).toBeDefined();
      const serviceSpan = ctx?.trace.spans.find((s) => s.name === 'UserService.findUserById');
      expect(serviceSpan).toBeDefined();
      expect(serviceSpan?.kind).toBe('INTERNAL');
      expect(serviceSpan?.attributes['user.role']).toBe('admin');
      expect(serviceSpan?.status.code).toBe('OK');
    });
  });

  it('TraceLensInterceptor bọc controller action execution', async () => {
    const interceptor = new TraceLensInterceptor();

    const mockContext = {
      getClass: () => ({ name: 'OrderController' }),
      getHandler: () => ({ name: 'createOrder' }),
    };

    const mockNext = {
      handle: () => Promise.resolve({ orderId: 'ord_99' }),
    };

    await runWithTraceContext({ traceId: '4bf92f3577b34da6a3ce929d0e0e4736' }, async () => {
      const result = await interceptor.intercept(mockContext, mockNext);
      expect(result.orderId).toBe('ord_99');

      const ctx = getActiveContext();
      const actionSpan = ctx?.trace.spans.find((s) => s.name === 'OrderController.createOrder');
      expect(actionSpan).toBeDefined();
      expect(actionSpan?.attributes['controller.class']).toBe('OrderController');
      expect(actionSpan?.status.code).toBe('OK');
    });
  });

  it('TraceLens middleware ghi nhận HTTP request vào hub', async () => {
    const hub = TraceLensModule.getHub();
    const middleware = TraceLensModule.createMiddleware({ serviceName: 'order-api' });

    const req: any = {
      method: 'POST',
      originalUrl: '/api/v1/orders',
      headers: {
        'user-agent': 'NestClient/1.0',
      },
      query: { coupon: 'SAVE10' },
      body: { total: 100 },
    };

    let finishCb: (() => void) | undefined;
    const res: any = {
      statusCode: 201,
      once: vi.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
      removeListener: vi.fn(),
    };

    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);

    // Simulate res finish
    if (finishCb) finishCb();

    const recent = hub.getRecentTraces();
    const lastTrace = recent[recent.length - 1];
    expect(lastTrace).toBeDefined();
    expect(lastTrace.name).toBe('POST /api/v1/orders');
    expect(lastTrace.http?.statusCode).toBe(201);
    expect(lastTrace.serviceName).toBe('order-api');
  });
});
