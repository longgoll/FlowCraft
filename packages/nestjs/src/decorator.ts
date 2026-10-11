import { startSpan, getActiveContext } from '@tracelens/core';
import type { SpanKind } from '@tracelens/protocol';

/**
 * Method Decorator cho NestJS Service / Controller methods
 * Tự động tạo child span và đo đạc thời gian thực thi, bắt lỗi
 */
export function TraceSpan(
  spanName?: string,
  kind: SpanKind = 'INTERNAL',
  extraAttributes?: Record<string, unknown>
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const resolvedName = spanName || `${target?.constructor?.name || 'Service'}.${propertyKey}`;

    descriptor.value = function (this: any, ...args: any[]) {
      if (!getActiveContext()) {
        return originalMethod.apply(this, args);
      }

      return startSpan(
        resolvedName,
        kind,
        {
          component: 'nestjs:method',
          'method.name': propertyKey,
          'class.name': target?.constructor?.name,
          ...extraAttributes,
        },
        async () => {
          return originalMethod.apply(this, args);
        }
      );
    };

    return descriptor;
  };
}
