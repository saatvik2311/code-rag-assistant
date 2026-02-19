@echo off
setlocal

echo ============================================================
echo   Code RAG Assistant (Windows)
echo ============================================================

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Ollama
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Ollama not found in PATH.
    echo Ensure Ollama is running for the assistant to work.
)

:: Install dependencies if node_modules is missing
if not exist "%~dp0node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
)

:: Start the server
echo [INFO] Starting Code RAG Server...
node "%~dp0server.js"

pause
