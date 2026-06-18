#!/usr/bin/env sh
set -eu

fail() {
  echo "setup failed: $*" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "node is required"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is required; this repository declares pnpm as its package manager"

echo "Installing dependencies with pnpm..."
pnpm install

echo "Setup complete."
