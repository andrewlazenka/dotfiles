#!/usr/bin/env bash

# link config
mkdir -p ~/.config/tmux
ln -s ~/code/andrewlazenka/dotfiles/.config/tmux/tmux.conf ~/.config/tmux/tmux.conf

# link theme
mkdir -p ~/.config/tmux/themes
ln -s ~/code/andrewlazenka/dotfiles/.config/tmux/themes/tokyonight.conf ~/.config/tmux/themes/tokyonight.conf

# install tpm for plugins
mkdir -p ~/.tmux/plugins
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

tmux source ~/.config/tmux/tmux.conf
