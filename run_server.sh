#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mdns=false
args=()
for arg in "$@"; do
  if [[ "$arg" == --mdns ]]; then mdns=true; else args+=("$arg"); fi
done
if $mdns; then
  export HOST="${HOST:-0.0.0.0}"
  port="${PORT:-4173}"
  for arg in "${args[@]+${args[@]}}"; do [[ "$arg" != --test ]] || port="${PORT:-4175}"; done
  if command -v dns-sd >/dev/null; then dns-sd -R 'Lab Book' _http._tcp local "$port" &
  elif command -v avahi-publish-service >/dev/null; then avahi-publish-service 'Lab Book' _http._tcp "$port" &
  else echo 'mDNS requires dns-sd (macOS) or avahi-utils (Linux).' >&2; exit 1; fi
  mdns_pid=$!
  trap 'kill "$mdns_pid" 2>/dev/null || true' EXIT
  node src/server/server.cjs "${args[@]+${args[@]}}" &
  server_pid=$!
  trap 'kill "$server_pid" "$mdns_pid" 2>/dev/null || true' EXIT
  trap 'exit 130' INT TERM
  wait "$server_pid"
else
  exec node src/server/server.cjs "${args[@]+${args[@]}}"
fi
