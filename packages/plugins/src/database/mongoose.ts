import { startSpan, getActiveContext } from '@tracelens/core';

/**
 * Tự động bọc Mongoose queries
 */
export function instrumentMongoose(mongooseModule: any): void {
  if (!mongooseModule || !mongooseModule.Query) return;

  const originalExec = mongooseModule.Query.prototype.exec;
  if ((originalExec as any).__tracelens_patched) return;

  mongooseModule.Query.prototype.exec = function (this: any, ...args: any[]) {
    if (!getActiveContext()) {
      return originalExec.apply(this, args);
    }

    const modelName = this.model?.modelName || 'UnknownModel';
    const op = this.op || 'query';
    const filter = JSON.stringify(this.getFilter ? this.getFilter() : {}).slice(0, 150);

    return startSpan(
      `mongo: ${modelName}.${op}`,
      'CLIENT',
      {
        'db.system': 'mongodb',
        'db.mongodb.collection': modelName,
        'db.operation': op,
        'db.statement': filter,
      },
      async (span) => {
        try {
          const result = await originalExec.apply(this, args);
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
  };

  (mongooseModule.Query.prototype.exec as any).__tracelens_patched = true;
}
