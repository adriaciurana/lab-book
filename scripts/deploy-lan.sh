#!/usr/bin/env bash
set -euo pipefail
# SSH handles authentication interactively. No credentials are saved here.
target=${LABBOOK_DEPLOY_TARGET:?Set LABBOOK_DEPLOY_TARGET to the deployment SSH host or user@host.}
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
# Publish only committed files. Per-machine settings and local secrets live outside Git.
git -C "$project" archive HEAD | ssh "$target" 'mkdir -p "$HOME/lab-book" && tar -xf - -C "$HOME/lab-book"'
ssh -t "$target" 'cd "$HOME/lab-book" && npm ci --omit=dev --ignore-scripts && node --check src/server/server.cjs && sudo install -d /etc/systemd/system/lab-book.service.d && sudo install -m 644 deploy/lab-book-source.conf /etc/systemd/system/lab-book.service.d/source.conf && sudo systemctl daemon-reload && sudo systemctl restart lab-book && curl --fail --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:4173/api/health'
printf '\nCode updated. Remote data was not copied or removed.\n'
printf 'Production service restarted. Open http://lab-book.local\n'
