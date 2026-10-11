const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'secret',
  'authorization',
  'auth',
  'cookie',
  'set-cookie',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'private_key',
  'credit_card',
  'cvv',
]);

export interface SanitizeOptions {
  maxStringLength?: number;
  maxArrayLength?: number;
  customSensitiveKeys?: string[];
}

/**
 * Cắt gọn payload chuỗi nếu vượt quá giới hạn an toàn để chống tràn RAM
 */
export function truncatePayload(data: unknown, maxBytes = 4096): unknown {
  if (typeof data === 'string') {
    if (data.length > maxBytes) {
      return data.slice(0, maxBytes) + `... [TRUNCATED +${data.length - maxBytes} chars]`;
    }
    return data;
  }
  return data;
}

/**
 * Ẩn các dữ liệu nhạy cảm (secrets/passwords) và bảo vệ bộ nhớ khỏi payload quá lớn
 */
export function sanitizeData<T>(data: T, depth = 0, options?: SanitizeOptions): T {
  if (depth > 6 || !data) {
    return data;
  }

  const maxStrLen = options?.maxStringLength ?? 4096;
  const maxArrLen = options?.maxArrayLength ?? 100;

  if (typeof data === 'string') {
    return truncatePayload(data, maxStrLen) as unknown as T;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    const sliced = data.slice(0, maxArrLen);
    const mapped = sliced.map((item) => sanitizeData(item, depth + 1, options));
    if (data.length > maxArrLen) {
      (mapped as any).push(`... [TRUNCATED ${data.length - maxArrLen} items]`);
    }
    return mapped as unknown as T;
  }

  const result: Record<string, unknown> = {};
  const sensitiveSet = options?.customSensitiveKeys
    ? new Set([...SENSITIVE_KEYS, ...options.customSensitiveKeys.map((k) => k.toLowerCase())])
    : SENSITIVE_KEYS;

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveSet.has(lowerKey)) {
      result[key] = '*** [REDACTED] ***';
    } else if (typeof value === 'string') {
      result[key] = truncatePayload(value, maxStrLen);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeData(value, depth + 1, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
