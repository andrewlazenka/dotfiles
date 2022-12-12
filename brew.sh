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
macOSTools=(
    grep
    openssh
    screen
    php
    gmp
)
brew install vim --with-override-system-vi
brew install $macOS

printf "[dotfiles] Install Fonts & Tools\n"
brew tap bramstein/webfonttools
brew tap homebrew/cask-fonts

fontsTools=(
    sfnt2woff
    sfnt2woff-zopfli
    woff2
    git
    git-lfs
    tree
)
brew install $fontsTools

fontsCasks=(
    font-cascadia-code
)
brew install --casks $fontsCasks

printf "[dotfiles] Install Browsers\n"
browsersCasks=(
    google-chrome
    firefox
    brave-browser
)
brew install --casks $browsersCasks

printf "[dotfiles] Install Productivity Applications\n"
productivityAppsCasks=(
    google-drive
    notion
    obsidian
    spotify
    numi
    calibre
)
brew install --casks $productivityAppsCasks

printf "[dotfiles] Install Communication Applications\n"
commApps=(
    slack
    discord
    zoomus
    loom
)
brew install --casks commApps

printf "[dotfiles] Install Development Applications\n"
devAppsCasks=(
    homebrew/cask-versions/visual-studio-code-insiders
    docker
    iterm2
    tableplus
    postman
    gifox
    graphiql
    rectangle
    mac-tex
    tmux
)
devApps=(rustup golang docker-compose nvm)
brew install --casks $devAppsCasks
brew install $devApps

printf "[dotfiles] Install CLI Tools\n"
brew tap cjbassi/ytop
cliTools=(
    zsh
    exa
    bat
    diff-so-fancy
    gh
    antibody
    procs
    dust
    ytop
    tealdeer
    ripgrep
)
brew install $cliTools

printf "\n"
printf "Setup complete!"
printf "\n"
