/**
 * JWT Token Utilities
 * Decode and extract claims from Cognito JWT tokens
 */

export interface JWTClaims {
  sub: string;
  email?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  'custom:customer_id'?: string;
  token_use?: string;
  exp?: number;
  iat?: number;
}

/**
 * Parse JWT token without verification (for client-side use only)
 * Backend verifies token authenticity
 */
export function parseJwt(token: string): JWTClaims | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Extract user role from JWT token
 * Returns 'admin', 'customer', or null
 */
export function getUserRole(token: string): 'admin' | 'customer' | null {
  const claims = parseJwt(token);
  if (!claims || !claims['cognito:groups']) {
    return null;
  }

  const groups = claims['cognito:groups'];

  // Check for admin role first (higher precedence)
  if (groups.includes('Admins')) {
    return 'admin';
  }

  if (groups.includes('Customers')) {
    return 'customer';
  }

  return null;
}

/**
 * Extract customer ID from JWT token
 * Returns customer_id or null
 */
export function getCustomerId(token: string): string | null {
  const claims = parseJwt(token);
  return claims?.['custom:customer_id'] || null;
}

/**
 * Extract email from JWT token
 * Returns email or null
 */
export function getEmail(token: string): string | null {
  const claims = parseJwt(token);
  return claims?.email || null;
}

/**
 * Check if user is admin
 */
export function isAdmin(token: string): boolean {
  return getUserRole(token) === 'admin';
}

/**
 * Check if user is customer
 */
export function isCustomer(token: string): boolean {
  return getUserRole(token) === 'customer';
}

