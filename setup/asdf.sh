#!/usr/bin/env bash

asdf plugin add nodejs
asdf plugin update nodejs
asdf install nodejs latest
asdf set nodejs latest

asdf plugin add ruby
asdf plugin update ruby
asdf install ruby latest
asdf set ruby latest