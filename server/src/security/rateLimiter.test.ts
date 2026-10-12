import { describe, it, expect } from 'vitest';
import { checkMessageRateLimit, recordMessageSent } from './rateLimiter';

describe('Message Rate Limiting & Cooldown Protection', () => {
  const testUserId = 'test_user_rate_limit_123';

  it('should allow initial message sending', () => {
    const result = checkMessageRateLimit(testUserId);
    expect(result.allowed).toBe(true);
  });

  it('should trigger cooldown immediately after sending a message', () => {
    recordMessageSent(testUserId);
    const cooldownResult = checkMessageRateLimit(testUserId);
    expect(cooldownResult.allowed).toBe(false);
    expect(cooldownResult.reason).toContain('Anti-spam cooldown active');
    expect(cooldownResult.waitSeconds).toBeGreaterThanOrEqual(1);
  });
});
