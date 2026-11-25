#!/bin/sh
set -eu
# SSH handles authentication interactively. No credentials are saved here.
target=${LABBOOK_DEPLOY_TARGET:-adria@192.168.1.146}
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ssh "$target" 'mkdir -p "$HOME/lab-book"'
rsync -az --exclude=.git --exclude=node_modules --exclude=data --exclude='.env*' --exclude='*.log' "$project/" "$target:lab-book/"
ssh -t "$target" 'cd "$HOME/lab-book" && npm ci --omit=dev --ignore-scripts && node --check src/server/server.cjs && sudo systemctl restart lab-book && curl --fail --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:4173/api/health'
printf '\nCode updated. Remote data was not copied or removed.\n'
printf 'Production service restarted. Open http://lab-book.local\n'
