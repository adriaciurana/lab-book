#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
unset ELECTRON_RUN_AS_NODE
exec ./node_modules/.bin/electron . "$@"
