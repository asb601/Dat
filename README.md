# Mission: Have a Good Day

A private, mobile-first itinerary for one special day. She opens an invite
link, accepts the mission, follows the checkpoints, completes a side quest —
and when mission control (you) approves it, the Movie Vault opens.

## How it works

- **Guest page `/`** — needs a valid session. The invite link
  `https://<site>/i/<GUEST_TOKEN>` exchanges the token for an HTTP-only cookie
  and redirects to the clean `/` URL. Without a session, `/` shows nothing.
- **Unlock flow** — she submits the side quest → state becomes `submitted` →
  you approve it in `/admin` → the server stamps `approvedAt` and opens the
  vault → her page picks it up by polling every 15 s.
- **Admin `/admin`** — password login (`/admin/login`), server-side sessions,
  5-failures/15-min lockout. Edit everything, approve/reject, lock/unlock,
  reorder movies, reset.
- **State** — one JSON document in Upstash Redis (Vercel marketplace) or, in
  local dev without Redis, a gitignored file in `.data/`. All personal
  content is seeded from `lib/seed.js` and edited in the admin dashboard.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local`:

| Variable | How to generate |
|---|---|
| `ADMIN_PASSWORD_HASH` | `npm run hash-password -- "your admin password"` |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `GUEST_TOKEN` | `openssl rand -hex 24` (16+ chars required) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | from Upstash / Vercel marketplace (optional locally) |

`KV_REST_API_URL` / `KV_REST_API_TOKEN` are accepted as aliases.

## Run locally

```bash
npm run dev        # http://localhost:3000
npm test           # auth + redaction tests (node --test)
npm run lint
npm run build
```

Open `http://localhost:3000/i/<GUEST_TOKEN>` for the guest view and
`http://localhost:3000/admin` for mission control.

## Deploy (Vercel)

1. Add the Upstash Redis integration (sets the `KV_*`/`UPSTASH_*` env vars).
2. Set `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `GUEST_TOKEN` in project env.
3. Deploy. Send her `https://<site>/i/<GUEST_TOKEN>`.

The production build fails closed: without Redis configured the API returns
errors instead of silently losing state.

## Filling in the placeholders

Everything in `[BRACKETS]` (stations, café, challenge, movie titles, notes)
lives in `lib/seed.js` and is editable at `/admin` — nothing personal is
hard-coded in components.
