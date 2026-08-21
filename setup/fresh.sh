#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -gt 1 || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [personal|work]"
    echo "A profile is required on first run and remembered for later runs."
    [[ $# -gt 1 ]] && exit 2 || exit 0
fi

DOTFILES_ROOT="$(dirname "$SCRIPT_DIR")"
# shellcheck source=lib/brew-profile.sh
source "$SCRIPT_DIR/lib/brew-profile.sh"
resolve_brew_profile "$DOTFILES_ROOT" "${1:-}"

# Authenticate once and keep the sudo timestamp active while the setup runs so
# privileged cask installers do not repeatedly prompt for a password.
echo "[dotfiles] Requesting administrator access for setup"
sudo -v
(
    while kill -0 "$$" 2>/dev/null; do
        sudo -n true || exit
        sleep 60
    done
) &
SUDO_KEEPALIVE_PID=$!

cleanup_sudo_keepalive() {
    kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
    wait "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
}
trap cleanup_sudo_keepalive EXIT

"$SCRIPT_DIR/brew.sh" "$BREW_PROFILE"
"$SCRIPT_DIR/zsh.sh"
"$SCRIPT_DIR/config.sh"
"$SCRIPT_DIR/mise.sh"
"$SCRIPT_DIR/pi.sh"
