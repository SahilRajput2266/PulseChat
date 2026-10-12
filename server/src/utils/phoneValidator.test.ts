import { describe, it, expect } from 'vitest';
import { validateAndNormalizePhone } from './phoneValidator';

describe('Phone Number Validation & Normalization', () => {
  it('should accept valid international phone numbers', () => {
    const result = validateAndNormalizePhone('+14155552671');
    expect(result.isValid).toBe(true);
    expect(result.digits).toBe('14155552671');
    expect(result.e164).toBe('+14155552671');
    expect(result.jid).toBe('14155552671@s.whatsapp.net');
  });

  it('should strip formatting characters, dashes, and spaces', () => {
    const result = validateAndNormalizePhone('+1 (415) 555-2671');
    expect(result.isValid).toBe(true);
    expect(result.digits).toBe('14155552671');
    expect(result.e164).toBe('+14155552671');
  });

  it('should handle already-formatted JID inputs', () => {
    const result = validateAndNormalizePhone('447123456789@s.whatsapp.net');
    expect(result.isValid).toBe(true);
    expect(result.digits).toBe('447123456789');
    expect(result.e164).toBe('+447123456789');
  });

  it('should reject non-digit strings', () => {
    const result = validateAndNormalizePhone('not-a-number');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject numbers that are too short', () => {
    const result = validateAndNormalizePhone('+1234');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid phone length');
  });

  it('should reject empty input', () => {
    const result = validateAndNormalizePhone('');
    expect(result.isValid).toBe(false);
  });
});
