import { startSpan, getActiveContext } from '@tracelens/core';

/**
 * Tự động bọc thư viện `pg` (PostgreSQL)
 */
export function instrumentPg(pgModule: any): void {
  if (!pgModule || !pgModule.Client) return;

  const originalQuery = pgModule.Client.prototype.query;
  if ((originalQuery as any).__tracelens_patched) return;

  pgModule.Client.prototype.query = function (this: any, ...args: any[]) {
    if (!getActiveContext()) {
      return originalQuery.apply(this, args);
    }

    const firstArg = args[0];
    const sqlText = typeof firstArg === 'string' ? firstArg : firstArg?.text || 'SQL Query';
    const cleanSql = sqlText.replace(/\s+/g, ' ').trim().slice(0, 200);

    return startSpan(
      `pg: ${cleanSql.slice(0, 40)}`,
      'CLIENT',
      {
        'db.system': 'postgresql',
        'db.statement': cleanSql,
      },
      (span) => {
        const callbackIndex = args.findIndex((arg) => typeof arg === 'function');

        // Trường hợp dùng callback
        if (callbackIndex !== -1) {
          const originalCb = args[callbackIndex];
          args[callbackIndex] = function (this: any, err: any, result: any) {
            if (err) {
              span.status = { code: 'ERROR', message: err.message };
            } else {
              span.attributes['db.rows_count'] = result?.rowCount || 0;
              span.status = { code: 'OK' };
            }
            return originalCb.apply(this, arguments);
          };
          return originalQuery.apply(this, args);
        }

        // Trường hợp trả về Promise
        const resultPromise = originalQuery.apply(this, args);
        if (resultPromise && typeof resultPromise.then === 'function') {
          return resultPromise
            .then((res: any) => {
              span.attributes['db.rows_count'] = res?.rowCount || 0;
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

  (pgModule.Client.prototype.query as any).__tracelens_patched = true;
}
