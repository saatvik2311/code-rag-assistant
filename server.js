const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-coder:6.7b';
const VECTOR_STORE_PATH = path.join(__dirname, 'vector_store.json');
const DOCS_DIR = path.join(__dirname, 'docs');

// ─── Load Modules ────────────────────────────────────────────
const { scanRepo, chunkCode, CODE_EXTENSIONS, LANG_MAP } = require('./repo_scanner');
const { generateEdit, applyEdit, revertEdit } = require('./code_editor');
const { SessionManager } = require('./memory');
const { rlmRetrieve, hybridSearch, verifyAnswer, calculateConfidence, cosineSimilarity } = require('./rlm');
const { smartRoute, getAvailableModels, MODEL_REGISTRY } = require('./model_router');

const sessionManager = new SessionManager();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory vector store
let vectorStore = [];

// ─── Embedding ───────────────────────────────────────────────
async function getEmbedding(text) {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: text })
    });
    const data = await res.json();
    return data.embedding;
}

// ─── Chunking (docs) ─────────────────────────────────────────
function chunkText(text, source, chunkSize = 600, overlap = 100) {
    const chunks = [];
    const lines = text.split('\n');
    const titleLine = lines.find(l => l.startsWith('# '));
    const topic = titleLine ? titleLine.replace('# ', '') : source.replace('.md', '');
    let current = '';
    let chunkIndex = 0;

    for (const line of lines) {
        if (current.length + line.length > chunkSize && current.length > 0) {
            const prefixed = `[Topic: ${topic}] (from ${source})\n${current.trim()}`;
            chunks.push({
                id: `${source}_chunk_${chunkIndex}`,
                source,
                content: current.trim(),
                embeddingText: prefixed,
                embedding: null
            });
            chunkIndex++;
            const words = current.split(' ');
            const overlapWords = words.slice(-Math.floor(overlap / 5));
            current = overlapWords.join(' ') + '\n' + line;
        } else {
            current += (current ? '\n' : '') + line;
        }
    }
    if (current.trim()) {
        const prefixed = `[Topic: ${topic}] (from ${source})\n${current.trim()}`;
        chunks.push({
            id: `${source}_chunk_${chunkIndex}`,
            source,
            content: current.trim(),
            embeddingText: prefixed,
            embedding: null
        });
    }
    return chunks;
}

// ─── Routes ──────────────────────────────────────────────────

// Index all docs (multi-language)
app.post('/api/index', async (req, res) => {
    try {
        console.log('📚 Indexing documentation...');
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

        console.log(`📝 Created ${allChunks.length} chunks from ${files.length} files`);
        console.log('🔄 Generating embeddings... (this may take a minute)');

        let completed = 0;
        for (const chunk of allChunks) {
            chunk.embedding = await getEmbedding(chunk.embeddingText || chunk.content);
            completed++;
            if (completed % 10 === 0) {
                console.log(`   ✅ ${completed}/${allChunks.length} embeddings done`);
            }
        }

        vectorStore = allChunks;
        const toSave = allChunks.map(({ embeddingText, ...rest }) => rest);
        fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(toSave));
        console.log(`✅ Indexed ${vectorStore.length} chunks successfully!`);

        res.json({
            success: true,
            chunks: vectorStore.length,
            files: files.length,
            languages: [...new Set(allChunks.map(c => c.language).filter(Boolean))]
        });
    } catch (err) {
        console.error('❌ Indexing error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Scan Repository ─────────────────────────────────────────
app.post('/api/scan-repo', async (req, res) => {
    try {
        const { path: repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ error: 'No path provided' });

        const absPath = path.resolve(repoPath);
        if (!fs.existsSync(absPath)) {
            return res.status(400).json({ error: `Path not found: ${absPath}` });
        }

        console.log(`🔍 Scanning repository: ${absPath}`);
        const result = scanRepo(absPath);
        console.log(`📊 Found ${result.totalFiles} files, ${result.chunks.length} chunks`);

        // Embed all chunks
        console.log('🔄 Embedding code chunks...');
        let completed = 0;
        for (const chunk of result.chunks) {
            const prefix = `[${chunk.language || 'code'}] (${chunk.source})\n`;
            chunk.embedding = await getEmbedding(prefix + chunk.content);
            completed++;
            if (completed % 20 === 0) {
                console.log(`   ✅ ${completed}/${result.chunks.length} embeddings done`);
            }
        }

        // Merge into vector store
        vectorStore = vectorStore.concat(result.chunks);
        const toSave = vectorStore.map(({ embeddingText, ...rest }) => rest);
        fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(toSave));

        // Save to active session if one exists
        if (sessionManager.activeSessionId) {
            sessionManager.addRepoContext(sessionManager.activeSessionId, result);
        }

        console.log(`✅ Scanned and indexed ${result.chunks.length} code chunks`);

        res.json({
            success: true,
            name: result.name,
            totalFiles: result.totalFiles,
            totalLines: result.totalLines,
            chunks: result.chunks.length,
            languages: result.languageStats,
            symbols: Object.keys(result.symbols).length + ' files with symbols',
            imports: Object.keys(result.imports).length + ' files with imports'
        });
    } catch (err) {
        console.error('❌ Scan error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── RAG-powered Ask (with RLM pipeline) ─────────────────────
app.post('/api/ask', async (req, res) => {
    try {
        const { question, sessionId, language, contextFiles, forceModel } = req.body;
        if (!question) return res.status(400).json({ error: 'No question provided' });

        if (vectorStore.length === 0) {
            return res.status(400).json({ error: 'No docs indexed yet. Click "Index Docs" first.' });
        }

        // 0. Route to best model
        const route = forceModel
            ? { model: forceModel, task: 'manual', info: MODEL_REGISTRY[forceModel] || { name: forceModel, icon: '🤖' } }
            : await smartRoute(question, OLLAMA_URL);
        const chosenModel = route.model;
        console.log(`🤖 Routed to ${route.info?.name || chosenModel} (${route.task})`);

        // 1. RLM retrieval pipeline
        const rlmResult = await rlmRetrieve(
            vectorStore, question, getEmbedding, OLLAMA_URL, chosenModel,
            { enableDecomposition: true, enableVerification: false }
        );

        const relevant = rlmResult.chunks;
        const confidence = rlmResult.confidence;

        // 2. Build context from RAG
        const ragContext = relevant
            .map(r => `--- From ${r.source} (relevance: ${(r.score * 100).toFixed(1)}%) ---\n${r.content}`)
            .join('\n\n');

        // 2b. Add file context if provided
        let fileContext = '';
        if (contextFiles && contextFiles.length > 0) {
            const fileParts = [];
            for (const fp of contextFiles.slice(0, 10)) {
                try {
                    const absPath = path.resolve(fp);
                    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
                        const content = fs.readFileSync(absPath, 'utf-8').substring(0, 4000);
                        fileParts.push(`--- File: ${path.basename(absPath)} (${absPath}) ---\n${content}`);
                    }
                } catch (e) { /* skip unreadable files */ }
            }
            if (fileParts.length > 0) {
                fileContext = '\n\nUser-selected file context:\n' + fileParts.join('\n\n');
            }
        }

        const context = ragContext + fileContext;

        // 3. Get session history for context
        let historyContext = '';
        if (sessionId) {
            try {
                const ctxMessages = await sessionManager.getContextMessages(sessionId);
                if (ctxMessages.recent) {
                    const recent = ctxMessages.recent.slice(-3);
                    historyContext = '\nRecent conversation:\n' + recent.map(m =>
                        `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.substring(0, 300)}`
                    ).join('\n\n');

                    if (ctxMessages.summaries?.length > 0) {
                        historyContext = '\nConversation summary:\n' +
                            ctxMessages.summaries.slice(-2).join('\n') + historyContext;
                    }
                } else if (Array.isArray(ctxMessages)) {
                    const recent = ctxMessages.slice(-3);
                    historyContext = '\nRecent conversation:\n' + recent.map(m =>
                        `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.substring(0, 300)}`
                    ).join('\n\n');
                }
            } catch (e) { /* no session context */ }
        }

        // 4. Language-adaptive system prompt
        const langHint = language ? `Focus on ${language} when writing code examples.` : 'Detect the appropriate programming language from context.';
        const systemPrompt = `You are an expert programmer and coding assistant. You help solve coding problems quickly and efficiently across all programming languages.

Your answers should be:
- Concise and to the point
- Include working code examples in the appropriate language
- Mention time and space complexity when relevant
- Reference specific libraries, functions, and patterns
- ${langHint}

Use the following reference documentation to inform your answer:

${context}${historyContext}

Answer the question directly. If the documentation provides relevant code patterns, include them in your response.`;

        // 5. Stream from Ollama
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Send confidence + model info first
        res.write(`data: ${JSON.stringify({
            token: '',
            confidence: confidence,
            subQueries: rlmResult.subQueries,
            retrieved: rlmResult.retrieved,
            model: { id: chosenModel, name: route.info?.name || chosenModel, icon: route.info?.icon || '🤖', task: route.task }
        })}\n\n`);

        const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: chosenModel,
                prompt: question,
                system: systemPrompt,
                stream: true,
                options: { temperature: 0.3, top_p: 0.9, num_predict: 2048 }
            })
        });

        const reader = ollamaRes.body.getReader();
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
                        fullAnswer += parsed.response || '';
                        const data = {
                            token: parsed.response || '',
                            done: parsed.done || false,
                            sources: parsed.done ? relevant.map(r => ({
                                source: r.source,
                                score: (r.score * 100).toFixed(1) + '%',
                                language: r.language || 'docs',
                                preview: r.content.substring(0, 100) + '...'
                            })) : undefined
                        };
                        res.write(`data: ${JSON.stringify(data)}\n\n`);
                    } catch (e) { /* skip malformed JSON */ }
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            try {
                const parsed = JSON.parse(buffer);
                fullAnswer += parsed.response || '';
                const data = {
                    token: parsed.response || '',
                    done: true,
                    sources: relevant.map(r => ({
                        source: r.source,
                        score: (r.score * 100).toFixed(1) + '%',
                        language: r.language || 'docs',
                        preview: r.content.substring(0, 100) + '...'
                    }))
                };
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (e) { /* skip */ }
        }

        // Save to session
        if (sessionId) {
            try {
                sessionManager.addMessage(sessionId, 'user', question);
                sessionManager.addMessage(sessionId, 'assistant', fullAnswer,
                    relevant.map(r => r.source), { confidence: confidence.score });
            } catch (e) { /* ignore session errors */ }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (err) {
        console.error('❌ Ask error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

// ─── Code Editing ────────────────────────────────────────────
app.post('/api/edit', async (req, res) => {
    try {
        const { file, instruction } = req.body;
        if (!file || !instruction) {
            return res.status(400).json({ error: 'file and instruction are required' });
        }

        console.log(`✏️ Generating edit for: ${file}`);
        const result = await generateEdit(file, instruction);

        res.json({
            success: true,
            file: result.originalPath,
            diff: result.diff,
            originalLines: result.originalContent.split('\n').length,
            newLines: result.newContent.split('\n').length,
            newContent: result.newContent
        });
    } catch (err) {
        console.error('❌ Edit error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/apply-edit', async (req, res) => {
    try {
        const { file, newContent } = req.body;
        if (!file || !newContent) {
            return res.status(400).json({ error: 'file and newContent are required' });
        }

        console.log(`💾 Applying edit to: ${file}`);
        const result = applyEdit(file, newContent);

        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error('❌ Apply error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/revert-edit', async (req, res) => {
    try {
        const { file } = req.body;
        if (!file) return res.status(400).json({ error: 'file is required' });

        const result = revertEdit(file);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Session Management ──────────────────────────────────────
app.post('/api/sessions', (req, res) => {
    const { name } = req.body;
    const session = sessionManager.create(name);
    res.json({ success: true, session: { id: session.id, name: session.name } });
});

app.get('/api/sessions', (req, res) => {
    const sessions = sessionManager.list();
    res.json({ sessions });
});

app.get('/api/sessions/:id', (req, res) => {
    try {
        const session = sessionManager.load(req.params.id);
        res.json({ session });
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

app.delete('/api/sessions/:id', (req, res) => {
    sessionManager.delete(req.params.id);
    res.json({ success: true });
});

// ─── Status ──────────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
    const languages = {};
    for (const chunk of vectorStore) {
        const lang = chunk.language || 'docs';
        languages[lang] = (languages[lang] || 0) + 1;
    }

    let models = {};
    try {
        models = await getAvailableModels(OLLAMA_URL);
    } catch (e) {
        console.error('Error fetching models:', e.message);
    }

    res.json({
        indexed: vectorStore.length > 0,
        chunks: vectorStore.length,
        model: LLM_MODEL,
        embedModel: EMBED_MODEL,
        languages,
        sessions: sessionManager.list().length,
        models
    });
});

// ─── Models endpoint ─────────────────────────────────────────
app.get('/api/models', async (req, res) => {
    const models = await getAvailableModels(OLLAMA_URL);
    res.json({ models });
});

// ─── File Browser ────────────────────────────────────────────
app.post('/api/browse-files', (req, res) => {
    try {
        const { dirPath } = req.body;
        if (!dirPath) return res.status(400).json({ error: 'dirPath is required' });

        const absPath = path.resolve(dirPath);
        if (!fs.existsSync(absPath)) return res.status(400).json({ error: 'Path not found' });
        if (!fs.statSync(absPath).isDirectory()) return res.status(400).json({ error: 'Not a directory' });

        const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next', '.cache', 'coverage']);
        const CODE_EXT = new Set(['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt', '.scala', '.md', '.json', '.yaml', '.yml', '.toml', '.css', '.html', '.sql', '.sh', '.txt']);

        function readDir(dir, depth = 0) {
            if (depth > 3) return [];
            const items = [];
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.name.startsWith('.') && entry.name !== '.env') continue;
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        if (SKIP_DIRS.has(entry.name)) continue;
                        const children = readDir(fullPath, depth + 1);
                        items.push({ name: entry.name, path: fullPath, type: 'dir', children });
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (!CODE_EXT.has(ext)) continue;
                        const stat = fs.statSync(fullPath);
                        if (stat.size > 500000) continue; // skip files > 500KB
                        items.push({ name: entry.name, path: fullPath, type: 'file', size: stat.size });
                    }
                }
            } catch (e) { /* permission denied etc */ }
            return items.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        }

        const tree = readDir(absPath);
        res.json({ path: absPath, tree });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/read-context', (req, res) => {
    try {
        const { files } = req.body;
        if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'files array required' });

        const results = [];
        let totalSize = 0;
        const MAX_TOTAL = 20000; // 20KB max total context

        for (const fp of files.slice(0, 15)) {
            try {
                const absPath = path.resolve(fp);
                if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue;
                const content = fs.readFileSync(absPath, 'utf-8');
                const truncated = content.substring(0, Math.min(4000, MAX_TOTAL - totalSize));
                totalSize += truncated.length;
                results.push({ path: absPath, name: path.basename(absPath), content: truncated, size: content.length });
                if (totalSize >= MAX_TOTAL) break;
            } catch (e) { /* skip */ }
        }

        res.json({ files: results, totalSize });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Languages endpoint ──────────────────────────────────────
app.get('/api/languages', (req, res) => {
    const languages = {};
    for (const chunk of vectorStore) {
        const lang = chunk.language || 'docs';
        languages[lang] = (languages[lang] || 0) + 1;
    }
    res.json({ languages });
});

// ─── Startup ─────────────────────────────────────────────────

// Load persisted vector store if exists
if (fs.existsSync(VECTOR_STORE_PATH)) {
    try {
        vectorStore = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf-8'));
        console.log(`📦 Loaded ${vectorStore.length} chunks from vector store`);
    } catch (e) {
        console.log('⚠️  Could not load existing vector store, will need to re-index');
    }
}

app.listen(PORT, () => {
    console.log(`\n🚀 CodeRAG — AI Coding Assistant running at http://localhost:${PORT}`);
    console.log(`📊 Vector store: ${vectorStore.length} chunks loaded`);
    console.log(`🤖 LLM: ${LLM_MODEL} | Embeddings: ${EMBED_MODEL}`);
    console.log(`💾 Sessions: ${sessionManager.list().length} saved`);
    if (vectorStore.length === 0) {
        console.log(`\n⚠️  No docs indexed yet! Click "Index Docs" in the UI or POST to /api/index`);
    }
});
