// Smallest checks that fail if the security/redaction logic breaks.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'test-secret-not-for-production';

const { hashPassword, verifyPassword, signSession, verifySessionToken } =
  await import('../lib/auth.js');
const { redactForGuest, stepUnlocked, challengeStatus } = await import('../lib/guest.js');
const { seedState } = await import('../lib/seed.js');

test('password hash round-trips and rejects wrong/malformed input', () => {
  const stored = hashPassword('correct horse battery');
  assert.equal(verifyPassword('correct horse battery', stored), true);
  assert.equal(verifyPassword('wrong', stored), false);
  assert.equal(verifyPassword('anything', 'not-a-hash'), false);
  assert.equal(verifyPassword('anything', ''), false);
});

test('session tokens verify, reject tampering and expiry', () => {
  const token = signSession('guest', 60);
  assert.equal(verifySessionToken(token)?.role, 'guest');

  const [payload, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 60000 }))
    .toString('base64url');
  assert.equal(verifySessionToken(`${forged}.${sig}`), null);
  assert.equal(verifySessionToken(`${payload}.AAAA`), null);
  assert.equal(verifySessionToken('garbage'), null);
  assert.equal(verifySessionToken(signSession('guest', -10)), null);
});

test('guest redaction hides locked locations and vaulted movies', () => {
  const state = seedState();
  const redacted = redactForGuest(state);

  const mystery = redacted.itinerary.find((s) => s.id === 'cafe');
  assert.equal(mystery.unlocked, false);
  assert.equal(mystery.location, null);

  assert.deepEqual(redacted.movies, []);
  assert.equal(redacted.selection, null);
  assert.equal(JSON.stringify(redacted).includes('[MOVIE ONE]'), false);

  state.vault.unlocked = true;
  const open = redactForGuest(state);
  assert.equal(open.movies.length, 3);
});

test('time-based unlock and challenge status transitions', () => {
  const past = new Date(Date.now() - 60000).toISOString();
  const future = new Date(Date.now() + 60000).toISOString();
  assert.equal(stepUnlocked({ locked: true, unlockAt: past }), true);
  assert.equal(stepUnlocked({ locked: true, unlockAt: future }), false);
  assert.equal(stepUnlocked({ locked: true, unlockAt: null }), false);
  assert.equal(stepUnlocked({ locked: false }), true);

  const state = seedState();
  assert.equal(challengeStatus(state), 'available');
  state.challenge.locked = true;
  assert.equal(challengeStatus(state), 'locked');
  state.challenge.locked = false;
  state.submission = { status: 'submitted' };
  assert.equal(challengeStatus(state), 'submitted');
});
