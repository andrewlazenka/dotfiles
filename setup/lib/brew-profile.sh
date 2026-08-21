#!/usr/bin/env bash

# Resolve the machine-specific Brewfile. Precedence is: explicit argument,
# DOTFILES_PROFILE, then the repository-local .brew-profile file.
resolve_brew_profile() {
    local dotfiles_root="$1"
    local requested_profile="${2:-${DOTFILES_PROFILE:-}}"

    BREW_PROFILE_FILE="$dotfiles_root/.brew-profile"

    if [[ -z "$requested_profile" && -f "$BREW_PROFILE_FILE" ]]; then
        IFS= read -r requested_profile < "$BREW_PROFILE_FILE"
    fi

    case "$requested_profile" in
        personal|work)
            BREW_PROFILE="$requested_profile"
            BREWFILE="$dotfiles_root/Brewfile.$BREW_PROFILE"
            ;;
        "")
            echo "No Homebrew profile selected." >&2
            echo "Choose one with: ./setup/fresh.sh personal|work" >&2
            return 1
            ;;
        *)
            echo "Invalid Homebrew profile: $requested_profile (expected personal or work)" >&2
            return 1
            ;;
    esac

    if [[ ! -f "$BREWFILE" ]]; then
        echo "Brewfile not found: $BREWFILE" >&2
        return 1
    fi
}

save_brew_profile() {
    printf '%s\n' "$BREW_PROFILE" > "$BREW_PROFILE_FILE"
}
