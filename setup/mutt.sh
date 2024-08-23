#!/usr/bin/env bash

# move config into home directory

mkdir -p ~/.config/neomutt
rm ~/.config/neomutt/neomuttrc
ln -s ~/Code/andrewlazenka/dotfiles/.config/neomutt ~/.config/neomutt
