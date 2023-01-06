#!/usr/bin/env bash

# Codespaces setup script

DOTFILES_DIR=/workspaces/.codespaces/.persistedshare/dotfiles

# nvim

# Symlink nvim config
mkdir -p ~/.config
ln -s $DOTFILES_DIR/nvim/.config/nvim ~/.config/nvim 

# Auto install packer plugins to avoid yelling errors on first boot
nvim --headless -c 'autocmd User PackerComplete quitall' -c 'PackerSync'

# zsh

# remove Codespace provided .zshrc
rm ~/.zshrc

ln -s $DOTFILES_DIR/.zshrc ~/.zshrc 
ln -s $DOTFILES_DIR/.aliases ~/.aliases 
