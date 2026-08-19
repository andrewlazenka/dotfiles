#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_ROOT="$(dirname "$SCRIPT_DIR")"
BREWFILE="$DOTFILES_ROOT/Brewfile"

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "This Homebrew setup currently targets macOS." >&2
    exit 1
fi

BREW_BIN="$(command -v brew || true)"

if [[ -z "$BREW_BIN" ]]; then
    echo "[dotfiles] Installing Homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
        if [[ -x "$candidate" ]]; then
            BREW_BIN="$candidate"
            break
        fi
    done
fi

if [[ -z "$BREW_BIN" ]]; then
    echo "Homebrew installation completed, but brew was not found." >&2
    exit 1
fi

# Make Homebrew and its tools available to the remaining setup steps.
eval "$("$BREW_BIN" shellenv)"

if [[ ! -f "$BREWFILE" ]]; then
    echo "Brewfile not found: $BREWFILE" >&2
    exit 1
fi

echo "Installing missing dependencies from $BREWFILE..."
brew bundle install --file="$BREWFILE" --no-upgrade
brew bundle check --file="$BREWFILE" --no-upgrade --verbose
