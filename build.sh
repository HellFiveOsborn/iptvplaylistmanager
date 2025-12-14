#!/bin/bash

# ============================================
# IPTV Playlist Manager - Build Script
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  IPTV Playlist Manager - Build Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
echo -e "${YELLOW}[1/4]${NC} Checking Node.js installation..."
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "       Node.js version: ${GREEN}$NODE_VERSION${NC}"

# Check for npm
echo -e "${YELLOW}[2/4]${NC} Checking npm installation..."
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "       npm version: ${GREEN}$NPM_VERSION${NC}"

# Install dependencies
echo -e "${YELLOW}[3/4]${NC} Installing dependencies..."
if [ -d "node_modules" ]; then
    echo "       node_modules exists, checking for updates..."
fi

npm install --silent

if [ $? -eq 0 ]; then
    echo -e "       Dependencies installed ${GREEN}successfully${NC}"
else
    echo -e "${RED}Error: Failed to install dependencies${NC}"
    exit 1
fi

# Build the project
echo -e "${YELLOW}[4/4]${NC} Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Build completed successfully!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "Output directory: ${BLUE}$SCRIPT_DIR/dist${NC}"
    echo ""
    echo "To preview the build locally, run:"
    echo -e "  ${YELLOW}npm run preview${NC}"
    echo ""
else
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
fi
