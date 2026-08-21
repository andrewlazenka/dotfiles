#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_ROOT="$(dirname "$SCRIPT_DIR")"
# shellcheck source=lib/brew-profile.sh
source "$SCRIPT_DIR/lib/brew-profile.sh"

if [[ $# -gt 1 ]]; then
    echo "Usage: $0 [personal|work]" >&2
    exit 2
fi

resolve_brew_profile "$DOTFILES_ROOT" "${1:-}"
save_brew_profile

echo "[dotfiles] Using Homebrew profile: $BREW_PROFILE"

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

echo "Installing missing dependencies from $BREWFILE..."
brew bundle install --file="$BREWFILE" --no-upgrade
brew bundle check --file="$BREWFILE" --no-upgrade --verbose
