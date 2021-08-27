if ! command -v brew > /dev/null; then
    printf "[dotfiles] Install Homebrew\n"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
fi

printf "[dotfiles] Update Homebrew\n"
brew update
printf "[dotfiles] Update Packages\n"
brew upgrade
printf "[dotfiles] Cleanup Outdated Versions\n"
brew cleanup

# Save Homebrew’s installed location.
BREW_PREFIX=$(brew --prefix)

printf "[dotfiles] Install Core Utils\n"

# Install GNU core utilities (those that come with macOS are outdated).
# Don’t forget to add `$(brew --prefix coreutils)/libexec/gnubin` to `$PATH`.
brew install coreutils
ln -s "${BREW_PREFIX}/bin/gsha256sum" "${BREW_PREFIX}/bin/sha256sum"

# Install some other useful utilities like `sponge`.
brew install moreutils
# Install GNU `find`, `locate`, `updatedb`, and `xargs`, `g`-prefixed.
brew install findutils
# Install GNU `sed`, overwriting the built-in `sed`.
brew install gnu-sed --with-default-names
# Install a modern version of Bash.
brew install bash
brew install bash-completion2

# Switch to using brew-installed bash as default shell
if ! fgrep -q "${BREW_PREFIX}/bin/bash" /etc/shells; then
    echo "${BREW_PREFIX}/bin/bash" | sudo tee -a /etc/shells;
    chsh -s "${BREW_PREFIX}/bin/bash";
fi;

printf "[dotfiles] Update MacOS tools\n"
# Install more recent versions of some macOS tools.
brew install vim --with-override-system-vi
brew install grep
brew install openssh
brew install screen
brew install php
brew install gmp

printf "[dotfiles] Install Fonts & Tools\n"
# Install font tools.
brew tap bramstein/webfonttools
brew install sfnt2woff
brew install sfnt2woff-zopfli
brew install woff2
brew install git
brew install git-lfs
brew install tree

# Install fonts
brew tap homebrew/cask-fonts
brew cask install font-cascadia

printf "[dotfiles] Install Productivity Applications\n"
brew cask install google-chrome
brew cask install firefox
brew cask install slack
brew cask install microsoft-outlook
brew cask install notion
brew cask install spotify
brew cask install zoomus
brew cask install numi

printf "[dotfiles] Install Development Applications\n"
brew cask install homebrew/cask-versions/visual-studio-code-insiders
brew cask install docker
brew cask install iterm2
brew cask install dbvisualizer
brew cask install postman
brew install docker-compose
brew install nvm
brew install zsh
brew install exa
brew install dockutil
brew install bat
brew install diff-so-fancy
brew install hub

printf "\n"
