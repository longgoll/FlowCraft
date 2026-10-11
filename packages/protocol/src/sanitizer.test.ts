import { describe, it, expect } from 'vitest';
import { sanitizeData } from './sanitizer.js';

describe('Sanitizer', () => {
  it('should redact sensitive keys case-insensitively', () => {
    const raw = {
      username: 'johndoe',
      password: 'supersecretpassword123',
      Authorization: 'Bearer eyJhbGciOi...',
      apiKey: 'sk-1234567890',
      normalField: 'hello world',
    };

    const sanitized = sanitizeData(raw);

    expect(sanitized.username).toBe('johndoe');
    expect(sanitized.password).toBe('*** [REDACTED] ***');
    expect(sanitized.Authorization).toBe('*** [REDACTED] ***');
    expect(sanitized.apiKey).toBe('*** [REDACTED] ***');
    expect(sanitized.normalField).toBe('hello world');
  });

  it('should recursively redact nested objects and arrays', () => {
    const raw = {
      user: {
        profile: {
          token: 'abc-xyz',
          address: '123 Main St',
        },
      },
      cards: [
        { cvv: '999', last4: '4242' },
        { cvv: '123', last4: '1111' },
      ],
    };

    const sanitized = sanitizeData(raw);

    expect(sanitized.user.profile.token).toBe('*** [REDACTED] ***');
    expect(sanitized.user.profile.address).toBe('123 Main St');
    expect(sanitized.cards[0].cvv).toBe('*** [REDACTED] ***');
    expect(sanitized.cards[0].last4).toBe('4242');
  });

  it('should safely return primitives as-is', () => {
    expect(sanitizeData('hello')).toBe('hello');
    expect(sanitizeData(1234)).toBe(1234);
    expect(sanitizeData(null)).toBeNull();
  });

  it('should truncate payload exceeding max string and array length', () => {
    const longString = 'x'.repeat(5000);
    const sanitized = sanitizeData({ text: longString }, 0, { maxStringLength: 100 });
    expect(sanitized.text).toContain('... [TRUNCATED +4900 chars]');

    const largeArray = Array.from({ length: 150 }, (_, i) => i);
    const sanitizedArray = sanitizeData({ items: largeArray }, 0, { maxArrayLength: 50 });
    expect(sanitizedArray.items.length).toBe(51);
    expect(sanitizedArray.items[50]).toContain('... [TRUNCATED 100 items]');
  });
});
