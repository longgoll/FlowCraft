import { startSpan, getActiveContext } from '@tracelens/core';

/**
 * Tự động bọc thư viện `mysql2`
 */
export function instrumentMysql(mysqlModule: any): void {
  if (!mysqlModule) return;

  const patchTarget = mysqlModule.Connection?.prototype || mysqlModule;
  if (!patchTarget || !patchTarget.query) return;

  const originalQuery = patchTarget.query;
  if ((originalQuery as any).__tracelens_patched) return;

  patchTarget.query = function (this: any, ...args: any[]) {
    if (!getActiveContext()) {
      return originalQuery.apply(this, args);
    }

    const sql = typeof args[0] === 'string' ? args[0] : args[0]?.sql || 'MySQL Query';
    const cleanSql = sql.replace(/\s+/g, ' ').trim().slice(0, 200);

    return startSpan(
      `mysql: ${cleanSql.slice(0, 40)}`,
      'CLIENT',
      {
        'db.system': 'mysql',
        'db.statement': cleanSql,
      },
      (span) => {
        const resultPromise = originalQuery.apply(this, args);
        if (resultPromise && typeof resultPromise.then === 'function') {
          return resultPromise
            .then((res: any) => {
              span.status = { code: 'OK' };
              return res;
            })
            .catch((err: any) => {
              span.status = { code: 'ERROR', message: err?.message || String(err) };
              throw err;
            });
        }
        return resultPromise;
      }
    );
  };

  (patchTarget.query as any).__tracelens_patched = true;
}
