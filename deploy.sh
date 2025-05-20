#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22
export PATH="$HOME/.local/share/pnpm:$PATH"
cd ~/sites/sintesi/app
pnpm install
pm2 reload sintesi || pm2 start build/index.js --name sintesi