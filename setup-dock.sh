# clear dock
dockutil --remove all

# add applications
dockutil --add "/Applications/Google Chrome.app"
dockutil --add "/Applications/Firefox.app"
dockutil --add "/Applications/Safari.app"
dockutil --add "/Applications/Spotify.app"
dockutil --add "/Applications/Slack.app"
dockutil --add "/Applications/zoom.us.app"
dockutil --add "/Applications/Notion.app"
dockutil --add "/Applications/Numi.app"
dockutil --add "/Applications/Visual Studio Code - Insiders.app"
dockutil --add "/Applications/TablePlus.app"
dockutil --add "/Applications/iTerm.app"
dockutil --add "/Applications/Postman.app"
dockutil --add "/System/Applications/Utilities/Activity Monitor.app"
dockutil --add "/System/Applications/System Preferences.app"

# disable recent applications section
defaults write com.apple.dock show-recents -bool FALSE

killall Dock
