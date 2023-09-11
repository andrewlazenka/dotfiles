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
