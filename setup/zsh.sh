#!/usr/bin/env bash

# move zsh profile into home directory
rm -f ~/.zshrc
ln -s ~/code/andrewlazenka/dotfiles/.zshrc ~/.zshrc

# change default shell
chsh -s "$(which zsh)"
