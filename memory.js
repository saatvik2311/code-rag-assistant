/**
 * memory.js — Persistent Context Memory System
 * Session management, conversation history, project context, summarization
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.coderag');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-coder:6.7b';

// Ensure directories exist
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ─── Session Manager ─────────────────────────────────────────
class SessionManager {
    constructor() {
        this.sessions = {};
        this.activeSessionId = null;
        this._loadIndex();
    }

    _loadIndex() {
        const indexPath = path.join(SESSIONS_DIR, 'index.json');
        try {
            if (fs.existsSync(indexPath)) {
                this.sessions = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            }
        } catch (e) { this.sessions = {}; }
    }

    _saveIndex() {
        const indexPath = path.join(SESSIONS_DIR, 'index.json');
        fs.writeFileSync(indexPath, JSON.stringify(this.sessions, null, 2));
    }

    _sessionPath(id) {
        return path.join(SESSIONS_DIR, `${id}.json`);
    }

    // Create a new session
    create(name = '') {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const session = {
            id,
            name: name || `Session ${Object.keys(this.sessions).length + 1}`,
            created: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            messageCount: 0,
            messages: [],
            context: {
                scannedRepos: [],
                preferences: {},
                summaries: []
            }
        };

        this.sessions[id] = {
            id,
            name: session.name,
            created: session.created,
            lastActive: session.lastActive,
            messageCount: 0
        };

        this._saveIndex();
        this._saveSession(id, session);
        this.activeSessionId = id;
        return session;
    }

    // List all sessions
    list() {
        return Object.values(this.sessions)
            .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    }

    // Load a session
    load(id) {
        const sessionPath = this._sessionPath(id);
        if (!fs.existsSync(sessionPath)) {
            throw new Error(`Session not found: ${id}`);
        }
        const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        this.activeSessionId = id;
        return session;
    }

    // Delete a session
    delete(id) {
        const sessionPath = this._sessionPath(id);
        if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
        delete this.sessions[id];
        this._saveIndex();
        if (this.activeSessionId === id) this.activeSessionId = null;
    }

    // Add a message to the active session
    addMessage(id, role, content, sources = [], metadata = {}) {
        const session = this.load(id);
        session.messages.push({
            role,
            content: content.substring(0, 10000), // cap storage
            sources,
            timestamp: new Date().toISOString(),
            ...metadata
        });

        session.messageCount = session.messages.length;
        session.lastActive = new Date().toISOString();

        // Update index
        this.sessions[id].lastActive = session.lastActive;
        this.sessions[id].messageCount = session.messageCount;
        this._saveIndex();

        this._saveSession(id, session);
        return session;
    }

    // Get recent messages for context (with summarization trigger)
    async getContextMessages(id, maxRecent = 6) {
        const session = this.load(id);
        const messages = session.messages;

        if (messages.length <= maxRecent) {
            return messages;
        }

        // Include summaries + recent messages
        const summaries = session.context.summaries || [];
        const recent = messages.slice(-maxRecent);

        // Check if we need to summarize older messages
        const unsummarized = messages.slice(
            summaries.length > 0 ? summaries[summaries.length - 1].upToIndex + 1 : 0,
            messages.length - maxRecent
        );

        if (unsummarized.length >= 10) {
            const summary = await this._summarize(unsummarized);
            session.context.summaries.push({
                summary,
                upToIndex: messages.length - maxRecent - 1,
                timestamp: new Date().toISOString()
            });
            this._saveSession(id, session);
        }

        return {
            summaries: summaries.map(s => s.summary),
            recent
        };
    }

    // Summarize messages using LLM
    async _summarize(messages) {
        const conversationText = messages.map(m =>
            `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 500)}`
        ).join('\n\n');

        try {
            const res = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: LLM_MODEL,
                    prompt: `Summarize this coding conversation concisely, preserving key technical decisions, code patterns discussed, and any unresolved issues:\n\n${conversationText}\n\nSummary:`,
                    stream: false,
                    options: { temperature: 0.2, num_predict: 500 }
                })
            });
            const data = await res.json();
            return data.response || 'Conversation summary unavailable.';
        } catch (e) {
            return 'Conversation summary unavailable.';
        }
    }

    // Add scanned repo to session context
    addRepoContext(id, repoInfo) {
        const session = this.load(id);
        const existing = session.context.scannedRepos.findIndex(r => r.path === repoInfo.path);
        if (existing >= 0) {
            session.context.scannedRepos[existing] = {
                path: repoInfo.path,
                name: repoInfo.name,
                languages: repoInfo.languageStats,
                totalFiles: repoInfo.totalFiles,
                scannedAt: new Date().toISOString()
            };
        } else {
            session.context.scannedRepos.push({
                path: repoInfo.path,
                name: repoInfo.name,
                languages: repoInfo.languageStats,
                totalFiles: repoInfo.totalFiles,
                scannedAt: new Date().toISOString()
            });
        }
        this._saveSession(id, session);
    }

    _saveSession(id, session) {
        fs.writeFileSync(this._sessionPath(id), JSON.stringify(session, null, 2));
    }
}

module.exports = { SessionManager };
