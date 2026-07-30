#!/usr/bin/env bash

# 🏮 Koreki 1-Line Installer for Linux & macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/install/install.sh | bash

set -e

BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}---------------------------------------------------------${RESET}"
echo -e "${CYAN}${BOLD}  🏮 KOREKI ONE-LINE INSTALLER${RESET}"
echo -e "${CYAN}${BOLD}---------------------------------------------------------${RESET}"

if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✔ Node.js detected.${RESET}"
    TEMP_SCRIPT=$(mktemp /tmp/koreki-cli-XXXXXX.mjs)
    curl -fsSL https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/cli/index.mjs -o "$TEMP_SCRIPT"
    node "$TEMP_SCRIPT" "$@"
    rm -f "$TEMP_SCRIPT"
else
    echo -e "${RED}✖ Node.js is not installed.${RESET}"
    echo "Please install Node.js (18+) or Docker to run Koreki."
    echo "Visit https://nodejs.org or https://docs.docker.com/get-docker/"
    exit 1
fi
