#!/usr/bin/env bash

####################
# Install Homebrew #
####################
#
if ! command -v brew > /dev/null; then
    printf "[dotfiles] Install Homebrew\n"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
fi

brew update
brew upgrade

# Save Homebrew’s installed location

BREW_PREFIX=$(brew --prefix)

#################################
# Update pre-installed programs #
################################# 

brew install coreutils
ln -s "${BREW_PREFIX}/bin/gsha256sum" "${BREW_PREFIX}/bin/sha256sum"
brew install moreutils
brew install findutils
brew install gnu-sed
brew install bash
brew install bash-completion2

# Homebrew-installed bash as default shell 

if ! fgrep -q "${BREW_PREFIX}/bin/bash" /etc/shells; then
    echo "${BREW_PREFIX}/bin/bash" | sudo tee -a /etc/shells;
    chsh -s "${BREW_PREFIX}/bin/bash";
fi;

################
# System tools #
################

brew install vim --with-override-system-vi
brew install nvim
brew install grep
brew install openssh
brew install screen
brew install gmp
brew install git
brew install git-lfs
brew install tree
brew install gcc
brew install pnpm
brew install cask docker
brew install docker-compose
brew install cask tmux

#########
# Fonts #
#########

brew tap bramstein/webfonttools
brew tap homebrew/cask-fonts

brew install sfnt2woff
brew install sfnt2woff-zopfli
brew install woff2

brew install cask font-cascadia-code
brew install font-jetbrains-mono-nerd-font
brew install font-mona-sans
brew install font-commit-mono
brew install font-hubot-sans
brew install font-hack-nerd-font

################
# Applications #
################

# Development

brew install cask homebrew/cask-versions/visual-studio-code-insiders
brew install cask iterm2
brew install cask tableplus
brew install cask postman
brew install cask graphiql
brew install cask rectangle
brew install cask mac-tex
brew install 1password

# Browsers

brew install cask google-chrome
brew install cask firefox
brew install cask brave-browser

# Communication

brew install cask slack
brew install cask discord
brew install cask zoomus
brew install cask loom
brew install cask gifox

# Productivity

brew install cask google-drive
brew install cask notion
brew install cask obsidian
brew install cask spotify
brew install cask numi
brew install cask calibre

#############
# Languages #
#############

brew install golang
brew install rustup
brew install php
brew install asdf

################
# CLI programs #
################

brew install zsh
brew install exa
brew install bat
brew install diff-so-fancy
brew install duf
brew install gh
brew install antibody
brew install procs
brew install btop
brew install bottom
brew install tealdeer
brew install ripgrep
brew install spotify-tui
brew install httpie
brew install speedtest-cli
brew install bandwhich
brew install procs
brew install neofetch
brew install lf
brew install lazygit
brew install lazydocker
brew install cava
brew install --cask background-music
brew install ncdu
brew install 1password-cli
brew install glow
brew tap FelixKratz/formulae
brew install sketchybar
brew install yazi
brew install sq
brew install --cask betterdisplay

#############
# ASCII art #
#############

brew install pipes-sh
brew tap sontek/snowmachine
brew install snowmachine

###############
# ZSH plugins #
###############

brew install starship
brew install zsh-autosuggestions
brew install zsh-syntax-highlighting
brew install zsh-completions
brew install zsh-history-substring-search

########################
# Post-install cleanup #
########################

brew cleanup
