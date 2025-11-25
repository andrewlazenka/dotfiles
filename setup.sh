#!/usr/bin/env bash

# Codespaces setup script

DOTFILES_DIR=/workspaces/.codespaces/.persistedshare/dotfiles

# nvim

# Symlink nvim config
mkdir -p ~/.config
ln -s $DOTFILES_DIR/.config/nvim ~/.config/nvim 

# install aliases
ln -s $DOTFILES_DIR/.aliases ~/.aliases

# tmux
mkdir -p ~/.config/tmux
ln -s $DOTFILES_DIR/.config/tmux/tmux.conf ~/.config/tmux/tmux.conf

# Install TPM (Tmux Plugin Manager)
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# packages
sudo apt-get update
sudo apt-get install -y neovim bat eza fzf ripgrep tmux

# starship prompt
curl -sS https://starship.rs/install.sh | sh

# lazygit
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit /usr/local/bin
