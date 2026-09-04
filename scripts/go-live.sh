#!/bin/sh
# One-shot go-live. Run from anywhere: sh scripts/go-live.sh
# 1. Creates a free kvdb.io keystore (no account) unless already done.
# 2. Commits everything and pushes main + deploy-retry.
# Vercel redeploys automatically on push.
set -e
cd "$(dirname "$0")/.."

if ! grep -q '^MISSION_KVDB_URL=' .env.production 2>/dev/null; then
  BUCKET=$(curl -sf -X POST -d 'email=mission-control@example.com' https://kvdb.io || true)
  if ! echo "$BUCKET" | grep -Eq '^[A-Za-z0-9]{8,}$'; then
    BUCKET=$(curl -sf -X POST https://kvdb.io || true)
  fi
  echo "$BUCKET" | grep -Eq '^[A-Za-z0-9]{8,}$' || { echo "could not create keystore — run this script again"; exit 1; }
  echo "MISSION_KVDB_URL=https://kvdb.io/$BUCKET" >> .env.production
  echo "keystore created: https://kvdb.io/$BUCKET"
fi

git add -A
git diff --cached --quiet || git commit -m "Add keystore storage and go live"
git branch -f main HEAD
git push -u origin deploy-retry main

echo ""
echo "Pushed. Vercel is redeploying — wait about a minute, then open:"
echo "  https://dat-rho-five.vercel.app"
