# CodeRAG System Architecture

## 🧠 Model Strategy (Hybrid)

CodeRAG uses a **multi-model** approach to optimize performance on macOS (M1/8GB RAM) without sacrificing quality. Instead of running one heavy model, we **hot-swap** specialized small models based on the task.

| Model | Size | Role | Strengths |
|---|---|---|---|
| **DeepSeek Coder 6.7B** | 6.7GB | **Fallback / Complex** | High-quality code generation, multi-language support. Default model. |
| **Qwen2.5-Coder 1.5B** | 0.9GB | **Fast Coding / Simple** | Extremely fast code completion, simple functions, "quick fixes". |
| **Phi-3 Mini 3.8B** | 2.2GB | **Reasoning / Explain** | Excellent general reasoning, explaining concepts, summarization. |

## ⚡ RAM Optimization & Swap Logic

Running large LLMs (>7B parameters) on 8GB RAM forces macOS to use **Swap Memory** (virtual RAM on SSD), which drastically reduces performance (tokens/sec drops from ~20 to ~1).

**Our Solution: Hot-Swapping**
- We only keep **one active model** in VRAM at a time.
- Ollama automatically unloads inactive models.
- **Switching speed:** < 2 seconds (due to fast SSD loading).
- Result: Maintains high tokens/sec performance even on 8GB machines.

## 🔀 Intelligent Router

A zero-overhead (regex-based) router analyzes your query intent before selecting a model:

1.  **Code Generation** (`write`, `implement`, `class`, `function`)
    -   **Target:** `qwen2.5-coder:1.5b` (Speed prioritized)
2.  **Explanation & Concepts** (`explain`, `what is`, `how does`)
    -   **Target:** `phi3:mini` (Reasoning prioritized)
3.  **Complex Logic / Debugging** (`debug`, `fix`, `error`)
    -   **Target:** `deepseek-coder:6.7b` (Capability prioritized)

## 📂 Capability Overview

-   **Context Injection**: Automatically reads selected files from the sidebar (`File Context`) and injects them into the prompt.
-   **RAG (Retrieval Augmented Generation)**: Indexes local docs (`docs/` folder) into vector storage (`nomic-embed-text`) for knowledge retrieval.
-   **Session Memory**: Maintains conversation history to provide continuity across queries.
