#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_ROOT="$(dirname "$SCRIPT_DIR")"
PI_SOURCE="$DOTFILES_ROOT/.pi/agent"
PI_TARGET="$HOME/.pi/agent"

mkdir -p "$PI_SOURCE" "$(dirname "$PI_TARGET")"

if [ -L "$PI_TARGET" ] && [ "$(readlink "$PI_TARGET")" = "$PI_SOURCE" ]; then
    : # The desired symlink is already in place.
elif [ -e "$PI_TARGET" ] || [ -L "$PI_TARGET" ]; then
    echo "$PI_TARGET already exists and is not the expected symlink" >&2
    exit 1
else
    echo "Creating symlink: $PI_TARGET -> $PI_SOURCE"
    ln -s "$PI_SOURCE" "$PI_TARGET"
fi

if ! command -v npm >/dev/null; then
    echo "npm is required to install Pi and its extension dependencies" >&2
    exit 1
fi

# Install Pi for the Node version selected by mise.
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
mise reshim 2>/dev/null || true

# Install dependencies that are intentionally excluded from the dotfiles repo.
npm install --prefix "$PI_SOURCE/extensions/fff"
npm ci --prefix "$PI_SOURCE/extensions/playwright-screenshot"
npm ci --prefix "$PI_SOURCE/extensions/web-access"

# Install the browser used by the screenshot extension.
"$PI_SOURCE/extensions/playwright-screenshot/node_modules/.bin/playwright" install chromium

echo "Pi configuration and extension dependencies have been set up successfully!"
