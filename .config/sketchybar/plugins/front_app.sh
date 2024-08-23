#!/usr/bin/env zsh

ICON_PADDING_RIGHT=5

case $INFO in
"Arc")
    ICON_PADDING_RIGHT=5
    ICON=󰞍
    ;;
"Code")
    ICON_PADDING_RIGHT=4
    ICON=󰨞
    ;;
"Calendar")
    ICON_PADDING_RIGHT=3
    ICON=
    ;;
"Discord")
    ICON=
    ;;
"FaceTime")
    ICON_PADDING_RIGHT=5
    ICON=
    ;;
"Finder")
    ICON=󰀶
    ;;
"Firefox")
    ICON=󰈹
    ;;
"Ghostty")
    ICON=
    ;;
"Google Chrome")
    ICON_PADDING_RIGHT=7
    ICON=
    ;;
"IINA")
    ICON_PADDING_RIGHT=4
    ICON=󰕼
    ;;
"Messages")
    ICON=
    ;;
"Numi")
    ICON_PADDING_RIGHT=3
    ICON=
    ;;
"Preview")
    ICON_PADDING_RIGHT=3
    ICON=
    ;;
"Rise")
    ICON_PADDING_RIGHT=3
    ICON=
    ;;
"Spotify")
    ICON_PADDING_RIGHT=2
    ICON=
    ;;
"TextEdit")
    ICON_PADDING_RIGHT=4
    ICON=
    ;;
*)
    ICON_PADDING_RIGHT=2
    ICON=
    ;;
esac

sketchybar --set $NAME icon=$ICON icon.padding_right=$ICON_PADDING_RIGHT
sketchybar --set $NAME.name label="$INFO"
