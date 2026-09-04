import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { seedState } from './seed';

const STATE_KEY = 'mission:state';

// Upstash Redis over REST (what Vercel's Redis/KV marketplace provisions).
// Plain fetch — no client library needed. Supports both env naming schemes.
const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Fallback backend: a kvdb.io bucket (e.g. https://kvdb.io/<bucket>) for
// zero-dashboard deploys. ponytail: free tier, 16KB/value — plenty here.
const KVDB_URL = process.env.MISSION_KVDB_URL;

async function redis(command) {
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`store: redis error ${res.status}`);
  return (await res.json()).result;
}

async function kvdbRead(key) {
  const res = await fetch(`${KVDB_URL}/${encodeURIComponent(key)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`store: kvdb read ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function kvdbWrite(key, raw) {
  const res = await fetch(`${KVDB_URL}/${encodeURIComponent(key)}`, {
    method: 'POST',
    body: raw,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`store: kvdb write ${res.status}`);
}

// Local-dev fallback: a gitignored JSON file. Not durable on serverless —
// production requires the Redis env vars.
const DATA_DIR = join(process.cwd(), '.data');

function filePath(key) {
  return join(DATA_DIR, `${key.replace(/[^a-z0-9-]/gi, '_')}.json`);
}

function assertConfigured() {
  if (!REST_URL && !KVDB_URL && process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    throw new Error(
      'store: no remote store configured. Set the Upstash env vars or MISSION_KVDB_URL.',
    );
  }
}

export async function readJSON(key) {
  assertConfigured();
  if (REST_URL) {
    const raw = await redis(['GET', key]);
    return raw ? JSON.parse(raw) : null;
  }
  if (KVDB_URL) return kvdbRead(key);
  try {
    return JSON.parse(readFileSync(filePath(key), 'utf8'));
  } catch {
    return null;
  }
}

export async function writeJSON(key, value) {
  assertConfigured();
  const raw = JSON.stringify(value);
  if (REST_URL) {
    await redis(['SET', key, raw]);
    return;
  }
  if (KVDB_URL) {
    await kvdbWrite(key, raw);
    return;
  }
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath(key), raw);
}

export async function getState() {
  const state = await readJSON(STATE_KEY);
  if (state) return state;
  const fresh = seedState();
  await writeJSON(STATE_KEY, fresh);
  return fresh;
}

// ponytail: read-modify-write without a lock — one guest + one admin, a race
// is astronomically unlikely; add Redis WATCH/Lua if this ever grows users.
export async function saveState(state) {
  state.meta.updatedAt = new Date().toISOString();
  await writeJSON(STATE_KEY, state);
  return state;
}

export async function resetState() {
  const fresh = seedState();
  fresh.meta.resetAt = new Date().toISOString();
  await writeJSON(STATE_KEY, fresh);
  return fresh;
}
