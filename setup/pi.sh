#!/usr/bin/env bash

# Exit on error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOTFILES_ROOT="$(dirname "$SCRIPT_DIR")"
PI_SOURCE="$DOTFILES_ROOT/.pi/agent"
PI_TARGET="$HOME/.pi/agent"

# Create the pi agent directory if it doesn't exist
mkdir -p "$PI_TARGET"

# Function to create symlinks
create_symlink() {
    local source="$1"
    local target="$2"

    # If target exists and is not a symlink, back it up
    if [ -e "$target" ] && [ ! -L "$target" ]; then
        echo "Backing up existing $target to ${target}.bak"
        mv "$target" "${target}.bak"
    fi

    # Replace an existing symlink
    if [ -L "$target" ]; then
        rm "$target"
    fi

    echo "Creating symlink: $target -> $source"
    ln -s "$source" "$target"
}

# Link portable configuration while leaving machine-specific state in ~/.pi
create_symlink "$PI_SOURCE/extensions" "$PI_TARGET/extensions"
create_symlink "$PI_SOURCE/themes" "$PI_TARGET/themes"
create_symlink "$PI_SOURCE/mcp.json" "$PI_TARGET/mcp.json"
create_symlink "$PI_SOURCE/settings.json" "$PI_TARGET/settings.json"

if ! command -v npm > /dev/null; then
    echo "npm is required to install pi extension dependencies" >&2
    exit 1
fi

# Install dependencies that are intentionally excluded from the dotfiles repo
npm install --prefix "$PI_SOURCE/extensions/fff"
npm ci --prefix "$PI_SOURCE/extensions/playwright-screenshot"
npm ci --prefix "$PI_SOURCE/extensions/web-access"

# Install the browser used by the screenshot extension
"$PI_SOURCE/extensions/playwright-screenshot/node_modules/.bin/playwright" install chromium

echo "Pi configuration and extension dependencies have been set up successfully!"
