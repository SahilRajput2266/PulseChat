/**
 * Utility for phone number parsing, validation, and JID conversion
 */

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string; // e.g. +14155552671
  digits: string; // e.g. 14155552671
  jid: string; // e.g. 14155552671@s.whatsapp.net
  error?: string;
}

export function validateAndNormalizePhone(rawInput: string): PhoneValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      e164: '',
      digits: '',
      jid: '',
      error: 'Phone number is required.'
    };
  }

  let cleaned = rawInput.trim();

  // Handle WhatsApp JID passed directly (e.g. 1234567890@s.whatsapp.net)
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[0];
  }

  // Remove whitespace, dashes, parens, brackets, dots
  cleaned = cleaned.replace(/[\s\-\(\)\[\]\.]/g, '');

  // Handle leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Verify only digits remain
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      e164: '',
      digits: '',
      jid: '',
      error: 'Phone number must contain only numerical digits.'
    };
  }

  // ITU-T E.164 numbers are between 7 and 15 digits (excluding country calling code prefixes)
  if (cleaned.length < 8 || cleaned.length > 15) {
    return {
      isValid: false,
      e164: '',
      digits: '',
      jid: '',
      error: `Invalid phone length (${cleaned.length} digits). International phone numbers should have 8 to 15 digits including country code.`
    };
  }

  return {
    isValid: true,
    e164: `+${cleaned}`,
    digits: cleaned,
    jid: `${cleaned}@s.whatsapp.net`
  };
}
