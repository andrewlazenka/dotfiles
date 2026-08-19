#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/brew.sh"
"$SCRIPT_DIR/zsh.sh"
"$SCRIPT_DIR/config.sh"
"$SCRIPT_DIR/mise.sh"
"$SCRIPT_DIR/pi.sh"
