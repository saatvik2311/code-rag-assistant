#!/bin/bash
# ─────────────────────────────────────────────────────
# CodeRAG — AI Coding Assistant (Multi-Language)
# Usage: ./coderag.sh [question] [--index] [--scan <path>]
# ─────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_PATH="$SCRIPT_DIR/cli.js"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install it first.${NC}"
    exit 1
fi

# Check Ollama
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama not running. Starting it...${NC}"
    ollama serve &
    sleep 3
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${RED}❌ Could not start Ollama. Please start it manually: ollama serve${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Ollama started${NC}"
fi

# Check required models
if ! ollama list 2>/dev/null | grep -q "deepseek-coder"; then
    echo -e "${YELLOW}Pulling deepseek-coder:6.7b model...${NC}"
    ollama pull deepseek-coder:6.7b
fi

if ! ollama list 2>/dev/null | grep -q "nomic-embed-text"; then
    echo -e "${YELLOW}Pulling nomic-embed-text model...${NC}"
    ollama pull nomic-embed-text
fi

# Check tesseract (for OCR, optional)
if ! command -v tesseract &> /dev/null; then
    echo -e "${YELLOW}ℹ️  Tesseract not installed. OCR features disabled. Install with: brew install tesseract${NC}"
fi

# Run the CLI
exec node "$CLI_PATH" "$@"
