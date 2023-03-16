#!/usr/bin/env bash

# move tmux config into home directory
rm ~/.tmux.conf
ln -s ~/Code/andrewlazenka/dotfiles/.tmux.conf ~/.tmux.conf

# install tpm for plugins
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
