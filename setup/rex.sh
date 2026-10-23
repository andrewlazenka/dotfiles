#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REX_SOURCE="$(dirname "$SCRIPT_DIR")/.config/rex"
REX_TARGET="${XDG_CONFIG_HOME:-$HOME/.config}/rex"

mkdir -p "$(dirname "$REX_TARGET")"

if [ -L "$REX_TARGET" ] && [ "$(readlink "$REX_TARGET")" = "$REX_SOURCE" ]; then
    echo "Rex configuration is already linked."
elif [ -e "$REX_TARGET" ] || [ -L "$REX_TARGET" ]; then
    echo "Refusing to overwrite $REX_TARGET; move it aside first." >&2
    exit 1
else
    ln -s "$REX_SOURCE" "$REX_TARGET"
    echo "Linked $REX_TARGET -> $REX_SOURCE"
fi
