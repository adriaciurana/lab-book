#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Install Node.js 22 or newer first.' >&2; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)' || { echo 'Node.js 22 or newer is required.' >&2; exit 1; }
npm ci
if [[ ! -f labbook.config.json ]]; then cp labbook.config.example.json labbook.config.json; fi
printf '%s\n' 'Installed. Start with ./run_server.sh or ./run_electron.sh.' 'Configure scheduled SOTA reviews in Settings while the server or desktop app is running.'

if [[ "${1:-}" == "--setup-admin" ]]; then
  read -r -p 'Administrator username [admin]: ' labbook_admin
  read -r -s -p 'Temporary password (at least 12 characters): ' labbook_password
  printf '\n'
  printf '%s' "$labbook_password" | node scripts/setup-admin.cjs "${labbook_admin:-admin}"
  unset labbook_password
  printf '%s\n' 'Sign in to Lab Book and change the temporary password before opening the workspace.'
fi
