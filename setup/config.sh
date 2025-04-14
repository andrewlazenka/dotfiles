#!/usr/bin/env bash

# Exit on error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOTFILES_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_SOURCE="$DOTFILES_ROOT/.config"
CONFIG_TARGET="$HOME/.config"

# Create ~/.config if it doesn't exist
mkdir -p "$CONFIG_TARGET"

# Function to create symlinks
create_symlink() {
    local source="$1"
    local target="$2"

    # If target exists and is not a symlink, back it up
    if [ -e "$target" ] && [ ! -L "$target" ]; then
        echo "Backing up existing $target to ${target}.bak"
        mv "$target" "${target}.bak"
    fi

    # Create the symlink
    echo "Creating symlink: $target -> $source"
    ln -sf "$source" "$target"
}

# Process each item in .config
for item in "$CONFIG_SOURCE"/*; do
    if [ -e "$item" ]; then
        item_name="$(basename "$item")"
        create_symlink "$item" "$CONFIG_TARGET/$item_name"
    fi
done

echo "Configuration symlinks have been set up successfully!"

