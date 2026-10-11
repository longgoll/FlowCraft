import { startSpan, getActiveContext } from '@tracelens/core';

/**
 * Prisma Extension cho Prisma 4.7+
 * Cách dùng: const prisma = new PrismaClient().$extends(tracelensPrismaExtension())
 */
export function tracelensPrismaExtension() {
  return {
    name: 'tracelens',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!getActiveContext()) {
            return query(args);
          }

          const spanName = `prisma: ${model}.${operation}`;

          return startSpan(
            spanName,
            'CLIENT',
            {
              'db.system': 'prisma',
              'prisma.model': model,
              'prisma.operation': operation,
            },
            async (span) => {
              try {
                const result = await query(args);
                span.status = { code: 'OK' };
                return result;
              } catch (error) {
                span.status = {
                  code: 'ERROR',
                  message: error instanceof Error ? error.message : String(error),
                };
                throw error;
              }
            }
          );
        },
      },
    },
  };
}

/**
 * Prisma Middleware cho mọi phiên bản Prisma
 * Cách dùng: attachPrismaTracing(prismaClient)
 */
export function attachPrismaTracing(prismaClient: any): void {
  if (!prismaClient || typeof prismaClient.$use !== 'function') return;

  prismaClient.$use(async (params: any, next: (params: any) => Promise<any>) => {
    if (!getActiveContext()) {
      return next(params);
    }

    const spanName = `prisma: ${params.model || 'raw'}.${params.action}`;

    return startSpan(
      spanName,
      'CLIENT',
      {
        'db.system': 'prisma',
        'prisma.model': params.model,
        'prisma.operation': params.action,
      },
      async (span) => {
        try {
          const result = await next(params);
          span.status = { code: 'OK' };
          return result;
        } catch (error) {
          span.status = {
            code: 'ERROR',
            message: error instanceof Error ? error.message : String(error),
          };
          throw error;
        }
      }
    );
  });
}
