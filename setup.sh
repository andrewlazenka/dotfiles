#!/usr/bin/env bash

# Codespaces setup script

DOTFILES_DIR=/workspaces/.codespaces/.persistedshare/dotfiles

# nvim

# Symlink nvim config
mkdir -p ~/.config
ln -s $DOTFILES_DIR/.config/nvim ~/.config/nvim 

# zsh

# remove Codespace provided .zshrc
rm ~/.zshrc

ln -s $DOTFILES_DIR/.zshrc ~/.zshrc 
ln -s $DOTFILES_DIR/.aliases ~/.aliases 

# packages

sudo apt-get update
sudo apt-get install neovim

# starship prompt
curl -sS https://starship.rs/install.sh | sh

# lazygit
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit /usr/local/bin
