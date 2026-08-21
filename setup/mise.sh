#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/composer.sh
source "$SCRIPT_DIR/lib/composer.sh"

if ! command -v mise >/dev/null 2>&1; then
    echo "mise is required but was not found on PATH" >&2
    exit 1
fi

echo "[dotfiles] Installing and updating configured mise tools"
mise install --yes
mise upgrade --yes

# Composer runs against mise's PHP rather than pulling in Homebrew PHP.
echo "[dotfiles] Installing the latest Composer"
install_latest_composer

echo "[dotfiles] Active mise tools"
mise current
