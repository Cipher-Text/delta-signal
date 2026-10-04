#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Error: pnpm is required. Install pnpm 9+ and try again." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Error: .env was not found at the repository root." >&2
  echo "Create it from .env.example and set DATABASE_URL and JWT_SECRET first." >&2
  exit 1
fi

# Load the same root configuration used for local development.
set -a
# shellcheck disable=SC1091
source .env
set +a

# The app runs on the host, so use the host's Redis instead of Docker's
# service hostname. Override HOST_REDIS_URL if Redis listens elsewhere.
export REDIS_URL="${HOST_REDIS_URL:-redis://127.0.0.1:6379}"
export API_URL="${API_URL:-http://localhost:3001}"
# PORT in the root .env belongs to the API. Keep Next.js from inheriting it;
# the API uses its default port (3001) when PORT is unset.
unset PORT

if ! command -v redis-cli >/dev/null 2>&1; then
  echo "Error: redis-cli is required to check the local Redis service." >&2
  exit 1
fi

if ! redis-cli -u "$REDIS_URL" ping 2>/dev/null | rg -q '^PONG$'; then
  echo "Error: Redis did not respond at $REDIS_URL. Start the local Redis service and try again." >&2
  exit 1
fi

echo "Using local Redis at $REDIS_URL"
echo "Starting Delta Signal apps on the host..."
exec pnpm dev
