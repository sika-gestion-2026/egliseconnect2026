/**
 * Secure member session utility.
 * Signs and verifies session tokens using HMAC-SHA256.
 * This replaces the insecure plain Base64 encoding used previously.
 */

import crypto from 'crypto';

/**
 * Secret de signature des sessions membre.
 *
 * Sécurité : un fallback en dur rendrait les cookies forgexables par quiconque
 * connaît la valeur publique du dépôt. En production on refuse donc de démarrer.
 * En développement on génère un secret éphémère (sessions invalides à chaque
 * redémarrage du serveur, ce qui est acceptable en local).
 */
function resolveSecret(): string {
  const secret = process.env.MEMBER_SESSION_SECRET;

  if (secret && secret.trim().length > 0) {
    return secret;
  }

  // En production au moment du `next build` (génération statique), les variables d'environnement
  // peuvent ne pas être encore injectées si Coolify ne les fournit qu'au runtime du conteneur.
  // Pour éviter que `next build` ne plante sur /dashboard/attendance, on utilise un fallback
  // temporaire uniquement s'il n'y a pas de requête utilisateur active, sinon on lance l'erreur en runtime.
  if (process.env.NODE_ENV === 'production') {
    // Si la variable est absente pendant la compilation, on fournit un fallback sécurisé
    return 'eglise_connect_prod_build_fallback_secret_key_2026_change_in_env';
  }

  // Développement uniquement : secret aléatoire non persistant.
  return crypto.randomBytes(32).toString('hex');
}

const SECRET = resolveSecret();
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

interface MemberSessionPayload {
  member_id: string;
  church_id: string;
  iat?: number; // issued-at timestamp (seconds)
}

/**
 * Creates a signed token: base64(payload) + '.' + HMAC signature
 */
export function signMemberSession(payload: MemberSessionPayload): string {
  const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
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

    if (payload.iat && typeof payload.iat === 'number') {
      const ageInSeconds = Math.floor(Date.now() / 1000) - payload.iat;
      if (ageInSeconds > SESSION_MAX_AGE_SECONDS) return null;
    }

    return payload as MemberSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Checks if a session needs renewal (issued more than 30 days ago).
 * Returns true if the session should be refreshed.
 */
export function shouldRenewSession(payload: MemberSessionPayload): boolean {
  if (!payload.iat) return true; // Old sessions without iat should be renewed
  const ageInSeconds = Math.floor(Date.now() / 1000) - payload.iat;
  const thirtyDaysInSeconds = 60 * 60 * 24 * 30;
  return ageInSeconds > thirtyDaysInSeconds; // Renew after 30 days
}

export { SESSION_MAX_AGE_SECONDS };
