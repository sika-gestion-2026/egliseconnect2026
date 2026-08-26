/**
 * Secure member session utility.
 * Signs and verifies session tokens using HMAC-SHA256.
 * This replaces the insecure plain Base64 encoding used previously.
 */

import crypto from 'crypto';

const SECRET = process.env.MEMBER_SESSION_SECRET || 'fallback-secret-change-in-production';

interface MemberSessionPayload {
  member_id: string;
  church_id: string;
}

/**
 * Creates a signed token: base64(payload) + '.' + HMAC signature
 */
export function signMemberSession(payload: MemberSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes a signed token.
 * Returns null if the token is invalid, tampered, or malformed.
 */
export function verifyMemberSession(token: string): MemberSessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, signature] = parts;

    // Recompute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(data)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));

    if (!payload.member_id || !payload.church_id) return null;

    return payload as MemberSessionPayload;
  } catch (e) {
    return null;
  }
}
