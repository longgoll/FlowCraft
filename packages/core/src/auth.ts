import type { DashboardAuthOptions } from '@tracelens/protocol';

export interface AuthContext {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  url?: string;
}

/**
 * Kiểm tra xác thực bảo vệ Dashboard UI & Ingest API
 * Hỗ trợ: HTTP Basic Auth, Bearer Token, Query param ?token=, và hàm validate tùy biến
 */
export function verifyDashboardAuth(
  context: AuthContext,
  options?: DashboardAuthOptions
): boolean {
  if (!options) return true;
  if (!options.username && !options.password && !options.token && !options.validate) {
    return true;
  }

  // 1. Kiểm tra qua custom validate
  if (options.validate) {
    return Boolean(options.validate(context));
  }

  const rawHeaders = context.headers || {};
  const authHeader = (rawHeaders['authorization'] || rawHeaders['Authorization']) as string | undefined;

  // 2. Kiểm tra Bearer Token hoặc Query param ?token=
  if (options.token) {
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === options.token) {
      return true;
    }
    if (context.query && String(context.query['token']) === options.token) {
      return true;
    }
  }

  // 3. Kiểm tra HTTP Basic Auth
  if (options.username && options.password) {
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf-8');
        const [user, pass] = credentials.split(':');
        if (user === options.username && pass === options.password) {
          return true;
        }
      } catch {
        return false;
      }
    }
  }

  return false;
}
