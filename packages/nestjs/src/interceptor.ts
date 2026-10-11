import { startSpan, getActiveContext } from '@tracelens/core';

/**
 * NestJS Interceptor: Tự động đo đạc Controller & Action Handler
 */
export class TraceLensInterceptor {
  intercept(context: any, next: any) {
    if (!getActiveContext()) {
      return next.handle();
    }

    const controllerName = context.getClass?.()?.name || 'Controller';
    const handlerName = context.getHandler?.()?.name || 'Handler';
    const spanName = `${controllerName}.${handlerName}`;

    return startSpan(
      spanName,
      'INTERNAL',
      {
        component: 'nestjs:interceptor',
        'controller.class': controllerName,
        'handler.action': handlerName,
      },
      (span: any) => {
        const stream$ = next.handle();

        // Nếu là RxJS Observable
        if (stream$ && typeof stream$.pipe === 'function') {
          return stream$.pipe({
            // Xử lý pipe nếu rxjs operator được truyền, hoặc wrap subscribe
            lift(operator: any) {
              return stream$.lift(operator);
            },
          });
        }

        // Nếu trả về Promise hoặc giá trị trực tiếp
        if (stream$ && typeof stream$.then === 'function') {
          return stream$
            .then((res: any) => {
              span.status = { code: 'OK' };
              return res;
            })
            .catch((err: any) => {
              span.status = { code: 'ERROR', message: err?.message || String(err) };
              throw err;
            });
        }

        return stream$;
      }
    );
  }
}
