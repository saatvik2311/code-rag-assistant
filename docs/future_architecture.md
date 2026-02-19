# Future Architecture: Distributed & Agentic Swarm

This document outlines high-level architectural proposals for two major enhancements:
1.  **Distributed Inference** (Mac M1 + Raspberry Pi 5)
2.  **Privacy-First Web Agent Swarm** (Gemini/ChatGPT Automation)

---

## 🍓 The "Sidecar" Architecture (Mac + Pi 5)

**Goal:** Offload background tasks and memory-heavy non-critical processes to a Raspberry Pi 5 (8GB) to free up the primary Mac M1 (8GB) for high-speed coding tasks.

### Architecture
-   **Primary Node (Mac M1):** The "Ferrari". Hosts the **Chat Interface** and fast coding models (`Qwen2.5-Coder`, `DeepSeek-Coder`).
-   **Secondary Node (Pi 5):** The "Workhorse". Hosts the **Vector Database**, **Embeddings Model**, and **Summarizer** (`Phi-3`).

### Workflow
1.  **Code Chat:** User queries go directly to Mac M1 → `Qwen2.5`. (Latency: ~50ms)
2.  **Repo Indexing:** User clicks "Scan Repo".
    -   Mac sends file contents to Pi 5 API.
    -   Pi 5 generates embeddings (`nomic-embed-text`) and stores vectors.
    -   Mac stays fully responsive (0% CPU load degradation).
3.  **Long-Context Summarization:**
    -   Chat history grows > 4k tokens.
    -   Mac sends history to Pi 5.
    -   Pi 5 (`Phi-3`) summarizes it in the background and returns a concise context block.

---

## 🕵️ The Web Agent Swarm (Incognito)

**Goal:** Leverage SOTA cloud models (Gemini, ChatGPT) for research and complex reasoning **without accounts or API keys**, using ephemeral browser automation.

### Core Principles
1.  **Privacy First:** All browsing happens in **Incognito Mode**. No history, cookies, or login sessions persist.
2.  **Ephemeral:** Browser tabs are created, used, and destroyed immediately.
3.  **Local Synthesis:** The final answer is constructed locally by `Qwen2.5`, ensuring a cohesive voice.

### The Pipeline

#### 1. The Planner (Local `Phi-3`)
Receives a complex user prompt: *"How do I implement WebRTC with a STUN server in Node.js?"*
Splits it into micro-tasks:
-   *Task A:* "WebRTC Node.js implementation guide"
-   *Task B:* "Free public STUN server list 2024"
-   *Task C:* "simple-peer vs socket.io-p2p comparison"

#### 2. The Swarm (Headless Browser)
Launches a headless browser (Puppeteer/Playwright) in **Incognito Context**.
-   **Tab 1 (Gemini):** Injects *Task A*. Captures the generated explanation.
-   **Tab 2 (ChatGPT):** Injects *Task C*. Captures the comparison.
-   **Tab 3 (Google Search):** Searches for *Task B*. Scrapes the top result.

*Constraints:*
-   Max 6 concurrent tabs.
-   Randomized user-agent and delays to mitigate bot detection.
-   **CAPTCHA Handling:** If triggered, the specific tab fails gracefully or flags for user intervention.

#### 3. The Synthesizer (Local `Qwen2.5`)
Aggregates the raw text from all tabs.
-   **Input:** 3 raw snippets (possibly contradictory or redundant).
-   **Process:** Deduplicates info, resolves conflicts, formats code blocks.
-   **Output:** One clean, authoritative guide presented to the user.

### Risk Assessment
-   **Anti-Bot:** High risk. Cloudflare/Google often block automated headless browsers.
-   **Latency:** High (5-15s). Requires user patience "Thinking..." UI.
-   **Maintenance:** Fragile. UI changes on Gemini/ChatGPT break scrapers instantly.
