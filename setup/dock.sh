#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_ROOT="$(dirname "$SCRIPT_DIR")"
# shellcheck source=lib/brew-profile.sh
source "$SCRIPT_DIR/lib/brew-profile.sh"

if [[ $# -gt 1 || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [personal|work]"
    echo "Uses the profile saved by setup/fresh.sh when none is provided."
    [[ $# -gt 1 ]] && exit 2 || exit 0
fi

resolve_brew_profile "$DOTFILES_ROOT" "${1:-}"

if ! command -v dockutil >/dev/null 2>&1; then
    echo "dockutil is required; install it with ./setup/brew.sh $BREW_PROFILE" >&2
    exit 1
fi

echo "[dotfiles] Using Dock profile: $BREW_PROFILE"

dockutil --remove all

add_dockfile() {
    local dockfile="$1"
    local app

    if [[ ! -f "$dockfile" ]]; then
        echo "Dockfile not found: $dockfile" >&2
        return 1
    fi

    while IFS= read -r app || [[ -n "$app" ]]; do
        [[ -z "$app" || "$app" =~ ^[[:space:]]*# ]] && continue
        dockutil --add "$app"
    done < "$dockfile"
}

add_dockfile "$DOTFILES_ROOT/Dockfile.$BREW_PROFILE"

killall Dock
