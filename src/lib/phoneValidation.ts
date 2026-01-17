/**
 * Phone Number Validation and Formatting Utilities
 * Supports E.164 format with auto-formatting for common US/international patterns
 */

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
}

// Common country codes
export const COUNTRY_CODES: { [key: string]: { code: string; name: string; digitCount: number } } = {
  US: { code: '1', name: 'United States', digitCount: 10 },
  CA: { code: '1', name: 'Canada', digitCount: 10 },
  GB: { code: '44', name: 'United Kingdom', digitCount: 10 },
  AU: { code: '61', name: 'Australia', digitCount: 9 },
  DE: { code: '49', name: 'Germany', digitCount: 10 },
  FR: { code: '33', name: 'France', digitCount: 9 },
  IN: { code: '91', name: 'India', digitCount: 10 },
  CN: { code: '86', name: 'China', digitCount: 11 },
  JP: { code: '81', name: 'Japan', digitCount: 10 },
  BR: { code: '55', name: 'Brazil', digitCount: 11 },
};

/**
 * Format phone number for display (user-friendly format)
 *
 * @param phone - Phone number in E.164 format
 * @param countryCode - ISO country code
 * @returns Formatted display string
 *
 * @example
 * formatPhoneForDisplay('+18455444580', 'US')  // '(845) 544-4580'
 * formatPhoneForDisplay('+447911123456', 'GB') // '07911 123456'
 */
export function formatPhoneForDisplay(phone: string, countryCode: string = 'US'): string {
  if (!phone) return '';

  // Remove + and country code
  const digitsOnly = phone.replace(/\D/g, '');
  const country = COUNTRY_CODES[countryCode] || COUNTRY_CODES.US;

  // Remove country code from digits
  let localNumber = digitsOnly;
  if (digitsOnly.startsWith(country.code)) {
    localNumber = digitsOnly.substring(country.code.length);
  }

  // Format based on country
  switch (countryCode) {
    case 'US':
    case 'CA':
      // Format: (845) 544-4580
      if (localNumber.length === 10) {
        return `(${localNumber.slice(0, 3)}) ${localNumber.slice(3, 6)}-${localNumber.slice(6)}`;
      }
      break;
    case 'GB':
      // Format: 07911 123456
      if (localNumber.length === 10) {
        return `${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
      }
      break;
    case 'AU':
      // Format: 0412 345 678
      if (localNumber.length === 9) {
        return `${localNumber.slice(0, 4)} ${localNumber.slice(4, 7)} ${localNumber.slice(7)}`;
      }
      break;
    case 'FR':
      // Format: 01 23 45 67 89
      if (localNumber.length === 9) {
        return `${localNumber.slice(0, 2)} ${localNumber.slice(2, 4)} ${localNumber.slice(4, 6)} ${localNumber.slice(6, 8)} ${localNumber.slice(8)}`;
      }
      break;
  }

  // Default: just add spaces every 3-4 digits
  if (localNumber.length > 6) {
    return `${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6)}`;
  } else if (localNumber.length > 3) {
    return `${localNumber.slice(0, 3)} ${localNumber.slice(3)}`;
  }

  return localNumber;
}

/**
 * Format phone number to E.164 based on selected country
 *
 * @param phone - Phone number (can include formatting)
 * @param countryCode - ISO country code (e.g., 'US', 'GB')
 * @returns Phone number in E.164 format
 *
 * @example
 * formatPhoneWithCountry('5551234567', 'US')  // '+15551234567'
 * formatPhoneWithCountry('7911123456', 'GB')  // '+447911123456'
 */
export function formatPhoneWithCountry(phone: string, countryCode: string = 'US'): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  if (!digitsOnly) return '';

  const country = COUNTRY_CODES[countryCode] || COUNTRY_CODES.US;

  // If the number already includes the country code, just add +
  if (digitsOnly.startsWith(country.code)) {
    return `+${digitsOnly}`;
  }

  // Add country code
  return `+${country.code}${digitsOnly}`;
}

/**
 * Auto-format phone number to E.164 format
 * Recognizes common US/Canada formats and international formats
 *
 * @param phone - Phone number in any format
 * @returns Phone number in E.164 format (+[country code][number])
 *
 * @example
 * formatToE164('(555) 123-4567') // '+15551234567'
 * formatToE164('555-123-4567')   // '+15551234567'
 * formatToE164('+15551234567')   // '+15551234567'
 */
export function formatToE164(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If already starts with +, validate and return
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Extract only digits
  const digitsOnly = cleaned.replace(/\+/g, '');

  // Handle based on length
  if (digitsOnly.length === 10) {
    // US/Canada 10-digit number: 5551234567 → +15551234567
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11) {
    // Could be US with leading 1, or international
    if (digitsOnly.startsWith('1')) {
      // US with leading 1: 15551234567 → +15551234567
      return `+${digitsOnly}`;
    }
    // International 11-digit number
    return `+${digitsOnly}`;
  }

  // International formats (1-9 digits or 12-15 digits)
  if (digitsOnly.length >= 1 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  // Fallback: return with + prefix if it has any digits
  return digitsOnly ? `+${digitsOnly}` : cleaned;
}

/**
 * Validate phone number in E.164 format
 *
 * @param phone - Phone number to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateE164('+15551234567')  // { isValid: true }
 * validateE164('5551234567')    // { isValid: false, error: '...' }
 */
export function validateE164(phone: string): PhoneValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Optional field
  }

  const trimmed = phone.trim();

  // E.164 format: +[country code 1-3 digits][subscriber number]
  // Total length: 8-15 characters (including +)
  const e164Regex = /^\+[1-9]\d{1,14}$/;

  if (e164Regex.test(trimmed)) {
    return { isValid: true };
  }

  if (!trimmed.startsWith('+')) {
    return {
      isValid: false,
      error: 'Phone number must start with +'
    };
  }

  if (trimmed.length < 8) {
    return {
      isValid: false,
      error: 'Phone number is too short'
    };
  }

  if (trimmed.length > 15) {
    return {
      isValid: false,
      error: 'Phone number is too long'
    };
  }

  if (!/^\+[0-9]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Phone number can only contain + and digits'
    };
  }

  return {
    isValid: false,
    error: 'Invalid phone number format'
  };
}
