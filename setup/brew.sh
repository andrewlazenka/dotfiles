#!/usr/bin/env bash

if ! command -v brew > /dev/null; then
    printf "[dotfiles] Install Homebrew\n"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
fi

brew update
brew upgrade

# save Homebrew’s installed location.
BREW_PREFIX=$(brew --prefix)

# install GNU core utilities (those that come with macOS are outdated).
# don’t forget to add `$(brew --prefix coreutils)/libexec/gnubin` to `$PATH`.
brew install coreutils
ln -s "${BREW_PREFIX}/bin/gsha256sum" "${BREW_PREFIX}/bin/sha256sum"

# install some other useful utilities like `sponge`.
brew install moreutils
# install GNU `find`, `locate`, `updatedb`, and `xargs`, `g`-prefixed.
brew install findutils
# install GNU `sed`, overwriting the built-in `sed`.
brew install gnu-sed
# install a modern version of Bash.
brew install bash
brew install bash-completion2

# switch to using brew-installed bash as default shell
if ! fgrep -q "${BREW_PREFIX}/bin/bash" /etc/shells; then
    echo "${BREW_PREFIX}/bin/bash" | sudo tee -a /etc/shells;
    chsh -s "${BREW_PREFIX}/bin/bash";
fi;

# install system tools
brew install vim --with-override-system-vi
brew install nvim
brew install grep
brew install openssh
brew install screen
brew install php
brew install gmp
brew install git
brew install git-lfs
brew install tree
brew install gcc
brew install pnpm

# install fonts
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

# install browsers
brew install cask google-chrome
brew install cask firefox
brew install cask brave-browser

# install productivity apps
brew install cask google-drive
brew install cask notion
brew install cask obsidian
brew install cask spotify
brew install cask numi
brew install cask calibre
brew install cron

# install communication apps
brew install cask slack
brew install cask discord
brew install cask zoomus
brew install cask loom

# install development apps
brew install cask homebrew/cask-versions/visual-studio-code-insiders
brew install cask docker
brew install cask iterm2
brew install cask tableplus
brew install cask postman
brew install cask gifox
brew install cask graphiql
brew install cask rectangle
brew install cask mac-tex
brew install cask tmux
brew install 1password
brew install 1password-cli

brew install golang
brew install rustup
brew install docker-compose
brew install asdf

brew install zsh
brew install exa
brew install bat
brew install diff-so-fancy
brew install duf
brew install gh
brew install antibody
brew install procs
brew install dust
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
brew install dust

# ascii art
brew install pipes-sh
brew tap sontek/snowmachine
brew install snowmachine

# install zsh plugins
brew install starship
brew install zsh-autosuggestions
brew install zsh-syntax-highlighting
brew install zsh-completions
brew install zsh-history-substring-search

brew cleanup
