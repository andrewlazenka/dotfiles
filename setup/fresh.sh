#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -gt 1 || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [personal|work]"
    echo "A profile is required on first run and remembered for later runs."
    [[ $# -gt 1 ]] && exit 2 || exit 0
fi

"$SCRIPT_DIR/brew.sh" "$@"
"$SCRIPT_DIR/zsh.sh"
"$SCRIPT_DIR/config.sh"
"$SCRIPT_DIR/mise.sh"
"$SCRIPT_DIR/pi.sh"
