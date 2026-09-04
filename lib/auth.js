import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'mission_session';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
  }
  // Dev-only ephemeral secret: sessions reset when the dev server restarts.
  globalThis.__missionDevSecret ||= randomBytes(32).toString('hex');
  return globalThis.__missionDevSecret;
}

// --- password hashing (scrypt, node stdlib) -------------------------------
// Stored format: <salt-hex>:<hash-hex>. Generate with `npm run hash-password`.

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  let expected;
  try {
    expected = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  const candidate = scryptSync(String(password), salt, 64);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// --- stateless signed sessions --------------------------------------------
// token = base64url({role, exp}) + '.' + hmac-sha256 signature

export function signSession(role, maxAgeSec) {
  const payload = Buffer.from(
    JSON.stringify({ role, exp: Date.now() + maxAgeSec * 1000 }),
  ).toString('base64url');
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (data.role !== 'guest' && data.role !== 'admin') return null;
    return data;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAgeSec) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  };
}
