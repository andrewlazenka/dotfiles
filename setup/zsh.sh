#!/usr/bash/env bash

# Install Oh-My-Zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

# move zsh profile into home directory
rm ~/.zshrc
ln -s ~/Code/andrewlazenka/dotfiles/.zshrc ~/.zshrc

# change default shell
chsh -s $(which zsh)
