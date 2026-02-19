# Code RAG Assistant

A local, AI-powered coding assistant that uses Retrieval-Augmented Generation (RAG) to help you understand and modify your codebase. It connects to local LLMs via Ollama to provide context-aware answers without sending your code to the cloud.

## Features
- **Local AI**: Runs entirely on your machine using Ollama (supports models like `qwen2.5-coder`, `deepseek-coder`).
- **Context Aware**: Scans your repository and vectorizes code for accurate retrieval.
- **Multi-Model Support**: Dynamically switches models based on query complexity.
- **Web Interface**: Simple chat interface to interact with your codebase.

## Requirements
1.  **Node.js**: [Download Node.js](https://nodejs.org/) (v18+)
2.  **Ollama**: [Download Ollama](https://ollama.com/)
    - Pull a model: `ollama pull qwen2.5-coder:7b`

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure**:
    The assistant uses default settings suitable for most local environments. Ensure Ollama is running in the background.

## Usage

### Windows
Double-click `coderag.bat`.

### macOS / Linux
Run the shell script:
```bash
./coderag.sh
```

The server will start on `http://localhost:3000` (or similar, check console output).

## License
MIT
