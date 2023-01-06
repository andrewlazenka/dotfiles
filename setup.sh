#!/usr/bin/env bash

# Codespaces setup script

# Symlink nvim config
mkdir -p ~/.config
ln -s /workspaces/.codespaces/.persistedshare/dotfiles/nvim/.config/nvim ~/.config/nvim 

# Auto install packer plugins to avoid yelling errors on first boot
nvim --headless -c 'autocmd User PackerComplete quitall' -c 'PackerSync'
