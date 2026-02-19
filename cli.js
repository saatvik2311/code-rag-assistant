#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── Config ──────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-coder:6.7b';
const DOCS_DIR = path.join(__dirname, 'docs');
const VECTOR_STORE_PATH = path.join(__dirname, 'vector_store.json');
const QUESTION_FILE = path.join(__dirname, 'question.txt');
const ANSWER_FILE = path.join(__dirname, 'answer.txt');
const DATA_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.coderag');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');
const MAX_HISTORY = 50;

// ─── Load Modules ────────────────────────────────────
const { scanRepo, chunkCode, LANG_MAP } = require('./repo_scanner');
const { generateEdit, applyEdit, revertEdit, formatDiffForTerminal } = require('./code_editor');
const { SessionManager } = require('./memory');
const { rlmRetrieve, cosineSimilarity } = require('./rlm');

const sessionManager = new SessionManager();

// ─── Colors ──────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
    magenta: '\x1b[35m', cyan: '\x1b[36m', red: '\x1b[31m',
    gray: '\x1b[90m', white: '\x1b[37m',
    bgBlue: '\x1b[44m', bgMagenta: '\x1b[45m', bgGray: '\x1b[100m',
};

// ─── Ensure data directory exists ────────────────────
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Conversation Memory ─────────────────────────────
let chatHistory = [];

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_PATH)) {
            chatHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
            return chatHistory.length;
        }
    } catch (e) { /* ignore corrupt history */ }
    return 0;
}

function saveHistory() {
    try {
        if (chatHistory.length > MAX_HISTORY) {
            chatHistory = chatHistory.slice(-MAX_HISTORY);
        }
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(chatHistory, null, 2));
    } catch (e) { /* ignore write errors */ }
}

function addToHistory(question, answer, sources) {
    chatHistory.push({
        timestamp: new Date().toISOString(),
        question,
        answer: answer.substring(0, 2000),
        sources: sources.map(s => s.source)
    });
    saveHistory();
}

// ─── Vector Store ────────────────────────────────────
let vectorStore = [];

// ─── Embedding ───────────────────────────────────────
async function getEmbedding(text) {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: text })
    });
    const data = await res.json();
    return data.embedding;
}

// ─── Chunking ────────────────────────────────────────
function chunkText(text, source, chunkSize = 600, overlap = 100) {
    const chunks = [];
    const lines = text.split('\n');
    const titleLine = lines.find(l => l.startsWith('# '));
    const topic = titleLine ? titleLine.replace('# ', '') : source.replace('.md', '');
    let current = '';
    let idx = 0;

    for (const line of lines) {
        if (current.length + line.length > chunkSize && current.length > 0) {
            const prefixed = `[Topic: ${topic}] (from ${source})\n${current.trim()}`;
            chunks.push({ id: `${source}_${idx}`, source, content: current.trim(), embeddingText: prefixed, embedding: null });
            idx++;
            const words = current.split(' ');
            current = words.slice(-Math.floor(overlap / 5)).join(' ') + '\n' + line;
        } else {
            current += (current ? '\n' : '') + line;
        }
    }
    if (current.trim()) {
        const prefixed = `[Topic: ${topic}] (from ${source})\n${current.trim()}`;
        chunks.push({ id: `${source}_${idx}`, source, content: current.trim(), embeddingText: prefixed, embedding: null });
    }
    return chunks;
}

// ─── Indexing ────────────────────────────────────────
async function indexDocs() {
    const supportedExt = ['.md', '.py', '.js', '.ts', '.java', '.go', '.rs', '.c', '.cpp', '.rb'];
    const files = fs.readdirSync(DOCS_DIR).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return supportedExt.includes(ext);
    });
    let allChunks = [];

    for (const file of files) {
        const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf-8');
        const ext = path.extname(file).toLowerCase();
        if (ext === '.md') {
            allChunks = allChunks.concat(chunkText(content, file));
        } else {
            const lang = LANG_MAP[ext] || 'unknown';
            allChunks = allChunks.concat(chunkCode(content, file, lang));
        }
    }

    process.stdout.write(`${C.cyan}⏳ Embedding ${allChunks.length} chunks from ${files.length} files...${C.reset}`);

    for (let i = 0; i < allChunks.length; i++) {
        allChunks[i].embedding = await getEmbedding(allChunks[i].embeddingText || allChunks[i].content);
        process.stdout.write(`\r${C.cyan}⏳ Embedding ${i + 1}/${allChunks.length} chunks...${C.reset}    `);
    }

    vectorStore = allChunks;
    const toSave = allChunks.map(({ embeddingText, ...rest }) => rest);
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(toSave));
    console.log(`\n${C.green}✅ Indexed ${vectorStore.length} chunks from: ${files.join(', ')}${C.reset}\n`);
}

// ─── TUI Box Drawing ─────────────────────────────────
function drawBox(title, content, color = C.dim) {
    const width = Math.min(process.stdout.columns || 80, 60);
    const inner = width - 4;
    console.log(`${color}┌─ ${title} ${'─'.repeat(Math.max(0, inner - title.length - 1))}┐${C.reset}`);
    const lines = content.split('\n');
    for (const line of lines) {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        const pad = Math.max(0, inner - stripped.length);
        console.log(`${color}│${C.reset} ${line}${' '.repeat(pad)} ${color}│${C.reset}`);
    }
    console.log(`${color}└${'─'.repeat(width - 2)}┘${C.reset}`);
}

// ─── Ask (with RLM pipeline) ─────────────────────────
async function ask(question) {
    if (vectorStore.length === 0) {
        console.log(`${C.red}❌ No docs indexed. Run with --index first.${C.reset}`);
        return;
    }

    // 1. RLM retrieval pipeline
    process.stdout.write(`${C.gray}🔍 Finding relevant docs...${C.reset}`);
    const rlmResult = await rlmRetrieve(
        vectorStore, question, getEmbedding, OLLAMA_URL, LLM_MODEL,
        { enableDecomposition: true, enableVerification: false }
    );
    const relevant = rlmResult.chunks;
    const confidence = rlmResult.confidence;
    process.stdout.write(`\r${C.gray}                            ${C.reset}\r`);

    // 2. Show sources & confidence
    const sourceLines = relevant.map(r => {
        const score = (r.score * 100).toFixed(1);
        const lang = r.language ? `${C.yellow}[${r.language}]${C.reset}` : '';
        return `${C.cyan}${r.source.padEnd(22)}${C.reset} ${C.green}${score}%${C.reset} ${lang}`;
    }).join('\n');
    drawBox(`Sources ${confidence.label}`, sourceLines);

    if (rlmResult.subQueries.length > 1) {
        console.log(`${C.dim}  Sub-queries: ${rlmResult.subQueries.join(' | ')}${C.reset}`);
    }
    console.log();

    // 3. Build context
    const context = relevant
        .map(r => `--- ${r.source} ---\n${r.content}`)
        .join('\n\n');

    let historyContext = '';
    const recent = chatHistory.slice(-2);
    if (recent.length > 0) {
        historyContext = '\nRecent conversation:\n' + recent.map(h =>
            `Q: ${h.question}\nA: ${h.answer.substring(0, 300)}...`
        ).join('\n\n');
    }

    const systemPrompt = `You are an expert programmer. Give concise, working solutions in the appropriate language.
Rules:
- Write clean, compilable code
- Mention time & space complexity
- Be direct, no fluff
- Detect the appropriate language from context
- Use the reference docs below to ground your answer

Reference docs:
${context}${historyContext}`;

    // 4. Stream response
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: LLM_MODEL,
            prompt: question,
            system: systemPrompt,
            stream: true,
            options: { temperature: 0.3, top_p: 0.9, num_predict: 2048 }
        })
    });

    console.log(`${C.magenta}${C.bold}Answer:${C.reset}\n`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullAnswer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.response) {
                        process.stdout.write(parsed.response);
                        fullAnswer += parsed.response;
                    }
                } catch (e) { /* skip */ }
            }
        }
    }

    if (buffer.trim()) {
        try {
            const parsed = JSON.parse(buffer);
            if (parsed.response) {
                process.stdout.write(parsed.response);
                fullAnswer += parsed.response;
            }
        } catch (e) { /* skip */ }
    }

    console.log('\n');
    addToHistory(question, fullAnswer, relevant);
}

// ─── File Watcher ────────────────────────────────────
let lastQuestionContent = '';
let isProcessing = false;

async function watchQuestionFile() {
    if (fs.existsSync(QUESTION_FILE)) {
        lastQuestionContent = fs.readFileSync(QUESTION_FILE, 'utf-8').trim();
    }

    console.log(`${C.cyan}👁️  Watching ${C.bold}question.txt${C.reset}${C.cyan} for changes...${C.reset}`);
    console.log(`${C.dim}Write your question in question.txt and save. Answer appears in answer.txt and below.${C.reset}`);
    console.log(`${C.dim}Press Ctrl+C to stop watching.${C.reset}\n`);

    fs.watchFile(QUESTION_FILE, { interval: 1000 }, async () => {
        if (isProcessing) return;

        try {
            const content = fs.readFileSync(QUESTION_FILE, 'utf-8').trim();
            if (!content || content === lastQuestionContent ||
                content.startsWith('Type your') || content.startsWith('Type a')) return;

            lastQuestionContent = content;
            isProcessing = true;

            console.log(`${C.green}📥 New question detected:${C.reset} ${C.blue}${content.substring(0, 80)}${content.length > 80 ? '...' : ''}${C.reset}\n`);

            const originalWrite = process.stdout.write.bind(process.stdout);
            let fullAnswer = '';
            const captureWrite = function (chunk, encoding, callback) {
                if (typeof chunk === 'string') fullAnswer += chunk;
                return originalWrite(chunk, encoding, callback);
            };

            process.stdout.write = captureWrite;
            await ask(content);
            process.stdout.write = originalWrite;

            const answerContent = `# Question\n${content}\n\n# Answer\n${fullAnswer.trim()}\n\n---\nGenerated: ${new Date().toLocaleString()}\n`;
            fs.writeFileSync(ANSWER_FILE, answerContent);
            console.log(`${C.green}📝 Answer saved to ${C.bold}answer.txt${C.reset}\n`);
            console.log(`${C.cyan}👁️  Watching for next question...${C.reset}\n`);

        } catch (e) {
            console.log(`${C.red}Error: ${e.message}${C.reset}`);
        } finally {
            isProcessing = false;
        }
    });

    process.on('SIGINT', () => {
        fs.unwatchFile(QUESTION_FILE);
        saveHistory();
        console.log(`\n${C.gray}💾 Stopped watching. History saved. Bye!${C.reset}`);
        process.exit(0);
    });

    await new Promise(() => { });
}

// ─── Interactive REPL ────────────────────────────────
async function repl() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${C.blue}${C.bold}code> ${C.reset}`
    });

    console.log(`${C.dim}Type your coding question. Commands: /index /scan /edit /sources /history /sessions /help /quit${C.reset}\n`);
    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) { rl.prompt(); return; }

        // ─── Quit ─────────────────────
        if (input === '/quit' || input === '/exit' || input === '/q') {
            saveHistory();
            console.log(`${C.gray}💾 History saved. Bye!${C.reset}`);
            process.exit(0);
        }

        // ─── Index ────────────────────
        if (input === '/index') {
            await indexDocs();
            rl.prompt();
            return;
        }

        // ─── Scan Repo ────────────────
        if (input.startsWith('/scan ')) {
            const repoPath = input.slice(6).trim();
            if (!repoPath) {
                console.log(`${C.red}Usage: /scan <path-to-repo>${C.reset}\n`);
                rl.prompt();
                return;
            }

            const absPath = path.resolve(repoPath);
            if (!fs.existsSync(absPath)) {
                console.log(`${C.red}❌ Path not found: ${absPath}${C.reset}\n`);
                rl.prompt();
                return;
            }

            console.log(`${C.cyan}🔍 Scanning: ${absPath}...${C.reset}`);
            const result = scanRepo(absPath);
            console.log(`${C.green}📊 Found ${result.totalFiles} files, ${result.totalLines} lines${C.reset}`);

            // Show language stats
            const langStats = Object.entries(result.languageStats)
                .sort((a, b) => b[1] - a[1])
                .map(([lang, count]) => `  ${C.cyan}${lang.padEnd(15)}${C.reset} ${count} files`)
                .join('\n');
            drawBox('Language Stats', langStats);

            // Embed chunks
            console.log(`${C.cyan}⏳ Embedding ${result.chunks.length} code chunks...${C.reset}`);
            for (let i = 0; i < result.chunks.length; i++) {
                const prefix = `[${result.chunks[i].language || 'code'}] (${result.chunks[i].source})\n`;
                result.chunks[i].embedding = await getEmbedding(prefix + result.chunks[i].content);
                process.stdout.write(`\r${C.cyan}⏳ ${i + 1}/${result.chunks.length}${C.reset}    `);
            }

            vectorStore = vectorStore.concat(result.chunks);
            const toSave = vectorStore.map(({ embeddingText, ...rest }) => rest);
            fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(toSave));
            console.log(`\n${C.green}✅ Scanned and indexed ${result.chunks.length} chunks from ${result.name}${C.reset}\n`);
            rl.prompt();
            return;
        }

        // ─── Edit File ───────────────
        if (input.startsWith('/edit ')) {
            const parts = input.slice(6).trim();
            const firstSpace = parts.indexOf(' ');
            if (firstSpace === -1) {
                console.log(`${C.red}Usage: /edit <file> <instruction>${C.reset}\n`);
                rl.prompt();
                return;
            }

            const file = parts.substring(0, firstSpace);
            const instruction = parts.substring(firstSpace + 1);

            const absPath = path.resolve(file);
            if (!fs.existsSync(absPath)) {
                console.log(`${C.red}❌ File not found: ${absPath}${C.reset}\n`);
                rl.prompt();
                return;
            }

            console.log(`${C.cyan}✏️ Generating edit for: ${path.basename(file)}...${C.reset}\n`);
            try {
                const result = await generateEdit(file, instruction);

                // Show colored diff
                console.log(formatDiffForTerminal(result.diff));
                console.log();

                // Ask for confirmation
                const answer = await new Promise(resolve => {
                    rl.question(`${C.yellow}Apply this edit? (y/n): ${C.reset}`, resolve);
                });

                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    const applied = applyEdit(file, result.newContent);
                    console.log(`${C.green}✅ Edit applied. Backup at: ${applied.backupPath}${C.reset}\n`);
                } else {
                    console.log(`${C.gray}❌ Edit discarded.${C.reset}\n`);
                }
            } catch (e) {
                console.log(`${C.red}❌ Edit failed: ${e.message}${C.reset}\n`);
            }
            rl.prompt();
            return;
        }

        // ─── Revert ──────────────────
        if (input.startsWith('/revert ')) {
            const file = input.slice(8).trim();
            try {
                const result = revertEdit(file);
                console.log(`${C.green}✅ Reverted: ${result.path}${C.reset}\n`);
            } catch (e) {
                console.log(`${C.red}❌ ${e.message}${C.reset}\n`);
            }
            rl.prompt();
            return;
        }

        // ─── Sources ─────────────────
        if (input === '/sources') {
            console.log(`${C.cyan}📦 ${vectorStore.length} chunks indexed${C.reset}`);
            const sources = [...new Set(vectorStore.map(c => c.source))];
            const langCounts = {};
            for (const c of vectorStore) {
                const lang = c.language || 'docs';
                langCounts[lang] = (langCounts[lang] || 0) + 1;
            }
            sources.forEach(s => console.log(`   ${C.dim}•${C.reset} ${s}`));
            console.log(`\n${C.bold}Languages:${C.reset}`);
            for (const [lang, count] of Object.entries(langCounts).sort((a, b) => b[1] - a[1])) {
                console.log(`   ${C.cyan}${lang.padEnd(15)}${C.reset} ${count} chunks`);
            }
            console.log();
            rl.prompt();
            return;
        }

        // ─── History ─────────────────
        if (input === '/history') {
            if (chatHistory.length === 0) {
                console.log(`${C.gray}No conversation history.${C.reset}\n`);
            } else {
                console.log(`${C.bold}📜 Last ${Math.min(5, chatHistory.length)} conversations:${C.reset}\n`);
                const recent = chatHistory.slice(-5);
                for (const h of recent) {
                    const time = new Date(h.timestamp).toLocaleString();
                    drawBox(`${time}`, `${C.blue}Q:${C.reset} ${h.question}\n${C.green}A:${C.reset} ${h.answer.substring(0, 150)}...`);
                    console.log();
                }
            }
            rl.prompt();
            return;
        }

        // ─── Clear ───────────────────
        if (input === '/clear') {
            chatHistory = [];
            saveHistory();
            console.log(`${C.green}✅ History cleared.${C.reset}\n`);
            rl.prompt();
            return;
        }

        // ─── Sessions ────────────────
        if (input === '/sessions') {
            const sessions = sessionManager.list();
            if (sessions.length === 0) {
                console.log(`${C.gray}No sessions. Use /new-session <name> to create one.${C.reset}\n`);
            } else {
                console.log(`${C.bold}💾 Sessions:${C.reset}\n`);
                for (const s of sessions) {
                    const active = s.id === sessionManager.activeSessionId ? `${C.green} ◀ active${C.reset}` : '';
                    console.log(`  ${C.cyan}${s.id}${C.reset} ${s.name} (${s.messageCount} msgs)${active}`);
                }
                console.log();
            }
            rl.prompt();
            return;
        }

        if (input.startsWith('/new-session')) {
            const name = input.slice(12).trim();
            const session = sessionManager.create(name);
            console.log(`${C.green}✅ Created session: ${session.name} (${session.id})${C.reset}\n`);
            rl.prompt();
            return;
        }

        if (input.startsWith('/load-session ')) {
            const id = input.slice(14).trim();
            try {
                const session = sessionManager.load(id);
                console.log(`${C.green}✅ Loaded session: ${session.name} (${session.messages.length} messages)${C.reset}\n`);
            } catch (e) {
                console.log(`${C.red}❌ ${e.message}${C.reset}\n`);
            }
            rl.prompt();
            return;
        }

        // ─── Question file ───────────
        if (input === '/question' || input === '/q file') {
            if (!fs.existsSync(QUESTION_FILE)) {
                console.log(`${C.red}❌ question.txt not found${C.reset}\n`);
                rl.prompt();
                return;
            }
            const content = fs.readFileSync(QUESTION_FILE, 'utf-8').trim();
            if (!content || content.startsWith('Type your') || content.startsWith('Type a')) {
                console.log(`${C.yellow}⚠️  question.txt is empty or has placeholder text.${C.reset}\n`);
                rl.prompt();
                return;
            }
            console.log(`${C.green}📥 Read from question.txt:${C.reset} ${C.blue}${content.substring(0, 80)}${content.length > 80 ? '...' : ''}${C.reset}\n`);

            const origWrite = process.stdout.write.bind(process.stdout);
            let fullAnswer = '';
            process.stdout.write = function (chunk, enc, cb) {
                if (typeof chunk === 'string') fullAnswer += chunk;
                return origWrite(chunk, enc, cb);
            };
            await ask(content);
            process.stdout.write = origWrite;

            const answerContent = `# Question\n${content}\n\n# Answer\n${fullAnswer.trim()}\n\n---\nGenerated: ${new Date().toLocaleString()}\n`;
            fs.writeFileSync(ANSWER_FILE, answerContent);
            console.log(`${C.green}📝 Answer saved to ${C.bold}answer.txt${C.reset}\n`);
            rl.prompt();
            return;
        }

        // ─── Watch ───────────────────
        if (input === '/watch') {
            console.log(`${C.cyan}Switching to file-watch mode...${C.reset}\n`);
            rl.close();
            await watchQuestionFile();
            return;
        }

        // ─── Help ────────────────────
        if (input === '/help') {
            console.log(`
${C.bold}Commands:${C.reset}
  ${C.cyan}/index${C.reset}                    Re-index documentation
  ${C.cyan}/scan <path>${C.reset}              Scan and index a repository
  ${C.cyan}/edit <file> <instruction>${C.reset} AI-powered code editing with diff preview
  ${C.cyan}/revert <file>${C.reset}            Revert last edit (restore .bak)
  ${C.cyan}/sources${C.reset}                  Show indexed doc files & languages
  ${C.cyan}/history${C.reset}                  Show recent conversation history
  ${C.cyan}/clear${C.reset}                    Clear conversation history
  ${C.cyan}/sessions${C.reset}                 List saved sessions
  ${C.cyan}/new-session <name>${C.reset}       Create a new session
  ${C.cyan}/load-session <id>${C.reset}        Load an existing session
  ${C.cyan}/question${C.reset}                 Read question.txt and solve it
  ${C.cyan}/watch${C.reset}                    Watch question.txt for changes
  ${C.cyan}/quit${C.reset}                     Exit

${C.bold}Just type a question to ask:${C.reset}
  ${C.dim}How does HashMap handle collisions?${C.reset}
  ${C.dim}Write a Python sliding window function${C.reset}
  ${C.dim}Explain Go goroutines and channels${C.reset}
  ${C.dim}Implement Dijkstra's algorithm in Rust${C.reset}
`);
            rl.prompt();
            return;
        }

        await ask(input);
        rl.prompt();
    });

    process.on('SIGINT', () => {
        saveHistory();
        console.log(`\n${C.gray}💾 History saved. Bye!${C.reset}`);
        process.exit(0);
    });
}

// ─── Main ────────────────────────────────────────────
async function main() {
    console.log(`
${C.bold}${C.magenta}⚡ CodeRAG${C.reset} ${C.dim}— AI Coding Assistant (Multi-Language)${C.reset}
${C.dim}Model: ${LLM_MODEL} | Embeddings: ${EMBED_MODEL}${C.reset}
`);

    // Check Ollama
    try {
        await fetch(`${OLLAMA_URL}/api/tags`);
        console.log(`${C.green}✅ Ollama connected${C.reset}`);
    } catch (e) {
        console.log(`${C.red}❌ Ollama not running! Start it with: ollama serve${C.reset}`);
        process.exit(1);
    }

    // Load conversation history
    const histCount = loadHistory();
    if (histCount > 0) {
        console.log(`${C.green}📜 Restored ${histCount} conversation(s) from history${C.reset}`);
    }

    // Load sessions
    const sessionCount = sessionManager.list().length;
    if (sessionCount > 0) {
        console.log(`${C.green}💾 ${sessionCount} saved session(s) available${C.reset}`);
    }

    // Load existing vector store
    if (fs.existsSync(VECTOR_STORE_PATH)) {
        try {
            vectorStore = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf-8'));
            console.log(`${C.green}📦 Loaded ${vectorStore.length} chunks from vector store${C.reset}`);
        } catch (e) {
            console.log(`${C.yellow}⚠️  Could not load vector store${C.reset}`);
        }
    }

    const args = process.argv.slice(2);

    if (args.includes('--index')) {
        await indexDocs();
        if (args.length === 1) process.exit(0);
    }

    if (vectorStore.length === 0) {
        console.log(`${C.yellow}⚠️  No docs indexed yet. Indexing now...${C.reset}\n`);
        await indexDocs();
    }

    if (args.includes('--watch')) {
        await watchQuestionFile();
        return;
    }

    // --scan <path> flag
    const scanIdx = args.indexOf('--scan');
    if (scanIdx !== -1 && args[scanIdx + 1]) {
        const repoPath = args[scanIdx + 1];
        console.log(`${C.cyan}🔍 Scanning: ${repoPath}...${C.reset}`);
        const result = scanRepo(path.resolve(repoPath));
        console.log(`${C.green}📊 Found ${result.totalFiles} files, ${result.chunks.length} chunks${C.reset}`);

        for (let i = 0; i < result.chunks.length; i++) {
            const prefix = `[${result.chunks[i].language || 'code'}] (${result.chunks[i].source})\n`;
            result.chunks[i].embedding = await getEmbedding(prefix + result.chunks[i].content);
            process.stdout.write(`\r${C.cyan}⏳ ${i + 1}/${result.chunks.length}${C.reset}    `);
        }
        vectorStore = vectorStore.concat(result.chunks);
        const toSave = vectorStore.map(({ embeddingText, ...rest }) => rest);
        fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(toSave));
        console.log(`\n${C.green}✅ Scanned and indexed ${result.chunks.length} chunks${C.reset}\n`);

        if (args.filter(a => !a.startsWith('--')).length === 0 && !args.includes('--index')) {
            process.exit(0);
        }
    }

    const questionArg = args.filter(a => !a.startsWith('--') && a !== args[scanIdx + 1]).join(' ');
    if (questionArg) {
        await ask(questionArg);
        process.exit(0);
    }

    await repl();
}

main().catch(err => {
    console.error(`${C.red}Fatal: ${err.message}${C.reset}`);
    process.exit(1);
});
