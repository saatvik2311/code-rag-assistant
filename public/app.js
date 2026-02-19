// ─── State ───────────────────────────────────────────
let isStreaming = false;
let activeSessionId = null;
let pendingEdit = null;
let selectedContextFiles = new Set();
let contextFileSizes = {};

// ─── Init ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    checkStatus();
    loadSessions();
    document.getElementById('question-input').focus();
});

// ─── Status Check ────────────────────────────────────
async function checkStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        document.getElementById('ollama-dot').className = 'status-dot online';
        document.getElementById('ollama-status').textContent = 'Connected';

        if (data.indexed) {
            document.getElementById('index-dot').className = 'status-dot online';
            document.getElementById('index-status').textContent = `${data.chunks} chunks`;
        } else {
            document.getElementById('index-dot').className = 'status-dot offline';
            document.getElementById('index-status').textContent = 'Not indexed';
        }

        document.getElementById('model-name').textContent = data.model;
        document.getElementById('session-count').textContent = data.sessions || 0;

        // Update models count
        if (data.models) {
            const availableCount = Object.values(data.models).filter(m => m.available).length;
            document.getElementById('models-count').textContent = `${availableCount} ready`;
        }
    } catch (e) {
        document.getElementById('ollama-dot').className = 'status-dot offline';
        document.getElementById('ollama-status').textContent = 'Offline';
    }
}

// ─── Index Docs ──────────────────────────────────────
async function indexDocs() {
    const btn = document.getElementById('index-btn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.querySelector('.btn-icon').textContent = '⏳';
    btn.querySelector('.btn-text').textContent = 'Indexing...';

    try {
        const res = await fetch('/api/index', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            const langs = data.languages ? ` (${data.languages.join(', ')})` : '';
            showToast(`✅ Indexed ${data.chunks} chunks from ${data.files} files${langs}`, 'success');
            checkStatus();
        } else {
            showToast('❌ Indexing failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (e) {
        showToast('❌ Indexing failed: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.querySelector('.btn-icon').textContent = '📚';
        btn.querySelector('.btn-text').textContent = 'Index Docs';
    }
}

// ─── Scan Repo ───────────────────────────────────────
function showScanModal() {
    document.getElementById('scan-modal').classList.add('active');
    document.getElementById('scan-path').focus();
}

function closeScanModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('scan-modal').classList.remove('active');
    document.getElementById('scan-status').textContent = '';
}

async function scanRepo() {
    const pathInput = document.getElementById('scan-path');
    const repoPath = pathInput.value.trim();
    if (!repoPath) return;

    const btn = document.getElementById('scan-submit-btn');
    const status = document.getElementById('scan-status');
    btn.disabled = true;
    btn.textContent = 'Scanning...';
    status.textContent = '🔍 Scanning repository and embedding code...';
    status.className = 'modal-status loading';

    try {
        const res = await fetch('/api/scan-repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: repoPath })
        });
        const data = await res.json();

        if (data.success) {
            const langs = Object.entries(data.languages || {})
                .map(([l, c]) => `${l}: ${c}`)
                .join(', ');
            status.textContent = `✅ Scanned ${data.totalFiles} files (${data.totalLines} lines), ${data.chunks} chunks indexed. Languages: ${langs}`;
            status.className = 'modal-status success';
            showToast(`✅ Scanned ${data.name}: ${data.chunks} chunks indexed`, 'success');
            checkStatus();
        } else {
            status.textContent = '❌ ' + (data.error || 'Scan failed');
            status.className = 'modal-status error';
        }
    } catch (e) {
        status.textContent = '❌ ' + e.message;
        status.className = 'modal-status error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Scan';
    }
}

// ─── Code Editing ────────────────────────────────────
function showEditModal() {
    document.getElementById('edit-modal').classList.add('active');
    document.getElementById('edit-file').focus();
    document.getElementById('diff-preview').innerHTML = '';
    document.getElementById('apply-actions').style.display = 'none';
    document.getElementById('edit-status').textContent = '';
    pendingEdit = null;
}

function closeEditModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('edit-modal').classList.remove('active');
    pendingEdit = null;
}

async function editFile() {
    const file = document.getElementById('edit-file').value.trim();
    const instruction = document.getElementById('edit-instruction').value.trim();
    if (!file || !instruction) return;

    const btn = document.getElementById('edit-submit-btn');
    const status = document.getElementById('edit-status');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    status.textContent = '✏️ AI is analyzing the file and generating edit...';
    status.className = 'modal-status loading';

    try {
        const res = await fetch('/api/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file, instruction })
        });
        const data = await res.json();

        if (data.success) {
            pendingEdit = { file: data.file, newContent: data.newContent };
            status.textContent = `✅ Edit generated: ${data.originalLines} → ${data.newLines} lines`;
            status.className = 'modal-status success';

            // Show diff
            document.getElementById('diff-preview').innerHTML = renderDiff(data.diff);
            document.getElementById('apply-actions').style.display = 'flex';
        } else {
            status.textContent = '❌ ' + (data.error || 'Edit failed');
            status.className = 'modal-status error';
        }
    } catch (e) {
        status.textContent = '❌ ' + e.message;
        status.className = 'modal-status error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Edit';
    }
}

async function applyEdit() {
    if (!pendingEdit) return;

    try {
        const res = await fetch('/api/apply-edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingEdit)
        });
        const data = await res.json();

        if (data.success) {
            showToast(`✅ Edit applied! Backup: ${data.backupPath}`, 'success');
            closeEditModal();
        } else {
            showToast('❌ ' + (data.error || 'Apply failed'), 'error');
        }
    } catch (e) {
        showToast('❌ ' + e.message, 'error');
    }
}

function renderDiff(diff) {
    if (!diff) return '';
    const lines = diff.split('\n').map(line => {
        const escaped = escapeHtml(line);
        if (line.startsWith('+++') || line.startsWith('---')) return `<div class="diff-line diff-header">${escaped}</div>`;
        if (line.startsWith('@@')) return `<div class="diff-line diff-hunk">${escaped}</div>`;
        if (line.startsWith('+')) return `<div class="diff-line diff-add">${escaped}</div>`;
        if (line.startsWith('-')) return `<div class="diff-line diff-del">${escaped}</div>`;
        return `<div class="diff-line">${escaped}</div>`;
    }).join('');
    return `<pre class="diff-block">${lines}</pre>`;
}

// ─── Sessions ────────────────────────────────────────
async function loadSessions() {
    try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        const list = document.getElementById('sessions-list');

        if (!data.sessions || data.sessions.length === 0) {
            list.innerHTML = '<div class="session-empty">No sessions yet</div>';
            return;
        }

        list.innerHTML = data.sessions.map(s => `
            <div class="session-item ${s.id === activeSessionId ? 'active' : ''}" onclick="loadSession('${s.id}')">
                <span class="session-name">${escapeHtml(s.name)}</span>
                <span class="session-meta">${s.messageCount} msgs</span>
                <button class="session-delete" onclick="event.stopPropagation(); deleteSession('${s.id}')" title="Delete">×</button>
            </div>
        `).join('');
    } catch (e) { /* ignore */ }
}

async function createSession() {
    const name = prompt('Session name:');
    if (!name) return;

    try {
        const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.success) {
            activeSessionId = data.session.id;
            showToast(`✅ Session "${data.session.name}" created`, 'success');
            loadSessions();
            checkStatus();
        }
    } catch (e) {
        showToast('❌ ' + e.message, 'error');
    }
}

async function loadSession(id) {
    try {
        const res = await fetch(`/api/sessions/${id}`);
        const data = await res.json();
        activeSessionId = id;

        // Clear messages
        const messages = document.getElementById('messages');
        messages.innerHTML = '';

        // Replay messages
        for (const msg of data.session.messages || []) {
            const el = addMessage(msg.role === 'user' ? 'user' : 'assistant',
                msg.role === 'user' ? msg.content : '');
            if (msg.role !== 'user') {
                const contentEl = el.querySelector('.message-text');
                contentEl.innerHTML = renderMarkdown(msg.content);
                addCopyButtons(contentEl);
            }
        }

        hljs.highlightAll();
        loadSessions();
        showToast(`Loaded: ${data.session.name}`, 'success');
    } catch (e) {
        showToast('❌ Session not found', 'error');
    }
}

async function deleteSession(id) {
    if (!confirm('Delete this session?')) return;
    try {
        await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
        if (activeSessionId === id) activeSessionId = null;
        loadSessions();
        checkStatus();
        showToast('Session deleted', 'success');
    } catch (e) { /* ignore */ }
}

// ─── File Context ────────────────────────────────────
async function browseFiles() {
    const input = document.getElementById('context-path');
    const path = input.value.trim();
    if (!path) return showToast('Please enter a directory path', 'error');

    const treeEl = document.getElementById('file-tree');
    treeEl.innerHTML = '<div class="loading-spinner"></div> Loading files...';

    try {
        const res = await fetch('/api/browse-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dirPath: path })
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        treeEl.innerHTML = '';
        renderFileTree(data.tree, treeEl);
        showToast(`Loaded files from ${data.path}`, 'success');
    } catch (e) {
        treeEl.innerHTML = `<div class="error-msg">❌ ${e.message}</div>`;
    }
}

function renderFileTree(items, container) {
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-msg">No code files found</div>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'tree-list';

    for (const item of items) {
        const li = document.createElement('li');
        li.className = `tree-item ${item.type}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'tree-checkbox';
        checkbox.dataset.path = item.path;
        if (selectedContextFiles.has(item.path)) checkbox.checked = true;

        checkbox.onchange = (e) => toggleFileSelection(item, e.target.checked);

        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = item.name + (item.size ? ` (${formatSize(item.size)})` : '');

        const row = document.createElement('div');
        row.className = 'tree-row';
        row.appendChild(checkbox);
        if (item.type === 'dir') {
            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            icon.textContent = '📁';
            row.appendChild(icon);
            row.appendChild(label);
            row.onclick = (e) => {
                if (e.target !== checkbox) {
                    li.classList.toggle('expanded');
                }
            };
        } else {
            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            icon.textContent = '📄';
            row.appendChild(icon);
            row.appendChild(label);
        }

        li.appendChild(row);

        if (item.children) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';
            renderFileTree(item.children, childrenContainer);
            li.appendChild(childrenContainer);
        }

        ul.appendChild(li);
    }
    container.appendChild(ul);
}

function toggleFileSelection(item, isSelected) {
    if (item.type === 'file') {
        if (isSelected) {
            selectedContextFiles.add(item.path);
            contextFileSizes[item.path] = item.size;
        } else {
            selectedContextFiles.delete(item.path);
            delete contextFileSizes[item.path];
        }
    } else if (item.children) {
        // Recursive selection for directories
        // Note: In a real app we'd need to update DOM checkboxes too
        // For simplicity here we just track state
    }
    updateSelectedStatus();
}

function updateSelectedStatus() {
    const count = selectedContextFiles.size;
    const totalSize = Object.values(contextFileSizes).reduce((a, b) => a + b, 0);
    const statusEl = document.getElementById('context-selected');

    if (count > 0) {
        statusEl.textContent = `${count} files selected (${formatSize(totalSize)})`;
        statusEl.classList.add('has-selection');
    } else {
        statusEl.textContent = '';
        statusEl.classList.remove('has-selection');
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── Ask Question ────────────────────────────────────
function askQuick(question) {
    document.getElementById('question-input').value = question;
    askQuestion();
}

async function askQuestion() {
    const input = document.getElementById('question-input');
    const question = input.value.trim();
    if (!question || isStreaming) return;

    isStreaming = true;
    input.value = '';
    autoResize(input);
    document.getElementById('send-btn').disabled = true;

    const welcome = document.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

    addMessage('user', question);

    const assistantMsg = addMessage('assistant', '');
    const contentEl = assistantMsg.querySelector('.message-text');
    contentEl.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;

    try {
        const body = { question };
        if (activeSessionId) body.sessionId = activeSessionId;
        if (selectedContextFiles.size > 0) body.contextFiles = Array.from(selectedContextFiles);

        const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            contentEl.innerHTML = `<p style="color: var(--red);">❌ ${err.error}</p>`;
            isStreaming = false;
            document.getElementById('send-btn').disabled = false;
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sources = null;
        let confidence = null;
        let modelInfo = null;
        let buffer = '';

        contentEl.innerHTML = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.confidence && !confidence) {
                            confidence = parsed.confidence;
                        }
                        if (parsed.model && !modelInfo) {
                            modelInfo = parsed.model;
                        }
                        if (parsed.token) {
                            fullText += parsed.token;
                            contentEl.innerHTML = renderMarkdown(fullText);
                            scrollToBottom();
                        }
                        if (parsed.sources) {
                            sources = parsed.sources;
                        }
                    } catch (e) { /* skip */ }
                }
            }
        }

        // Final render
        contentEl.innerHTML = renderMarkdown(fullText);
        addCopyButtons(contentEl);

        // Add badges (Confidence + Model)
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'message-badges';

        if (confidence) {
            const confBadge = document.createElement('span');
            confBadge.className = `badge confidence ${confidence.level}`;
            confBadge.textContent = `${confidence.label} (${confidence.score}%)`;
            badgesContainer.appendChild(confBadge);
        }

        if (modelInfo) {
            const modelBadge = document.createElement('span');
            modelBadge.className = `badge model-badge`;
            modelBadge.innerHTML = `<span class="model-icon">${modelInfo.icon}</span> ${modelInfo.name} <span class="model-task">(${modelInfo.task})</span>`;
            badgesContainer.appendChild(modelBadge);
        }

        if (badgesContainer.children.length > 0) {
            contentEl.insertAdjacentElement('afterbegin', badgesContainer);
        }

        // Add sources panel
        if (sources && sources.length > 0) {
            const sourcesHTML = createSourcesPanel(sources);
            contentEl.insertAdjacentHTML('beforeend', sourcesHTML);
        }

        hljs.highlightAll();
        scrollToBottom();
        loadSessions(); // refresh session message counts

    } catch (e) {
        contentEl.innerHTML = `<p style="color: var(--red);">❌ Error: ${e.message}</p>`;
    } finally {
        isStreaming = false;
        document.getElementById('send-btn').disabled = false;
        input.focus();
    }
}

// ─── Message Helpers ─────────────────────────────────
function addMessage(role, content) {
    const messages = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '⚡';
    msg.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${role === 'user' ? escapeHtml(content) : content}</div>
        </div>
    `;

    messages.appendChild(msg);
    scrollToBottom();
    return msg;
}

function scrollToBottom() {
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;
}

// ─── Markdown Renderer ──────────────────────────────
function renderMarkdown(text) {
    // Code blocks (with multi-language support)
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        const language = lang || 'plaintext';
        return `<pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
    });

    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>');
    text = text.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    text = text.replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>');
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');

    if (!text.startsWith('<')) {
        text = `<p>${text}</p>`;
    }

    return text;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Copy Buttons ────────────────────────────────────
function addCopyButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.copy-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';
        btn.onclick = () => {
            const code = pre.querySelector('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = '✓ Copied';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Copy';
                    btn.classList.remove('copied');
                }, 2000);
            });
        };
        pre.style.position = 'relative';
        pre.appendChild(btn);
    });
}

// ─── Sources Panel ───────────────────────────────────
function createSourcesPanel(sources) {
    const items = sources.map(s => `
        <div class="source-item">
            <span class="source-file">📄 ${s.source}</span>
            <span class="source-lang">${s.language || ''}</span>
            <span class="source-score">${s.score}</span>
        </div>
    `).join('');

    return `
        <div class="sources-panel">
            <button class="sources-toggle" onclick="toggleSources(this)">
                <span class="arrow">▶</span>
                <span>Sources (${sources.length} docs matched)</span>
            </button>
            <div class="sources-list">${items}</div>
        </div>
    `;
}

function toggleSources(btn) {
    btn.classList.toggle('open');
    const list = btn.nextElementSibling;
    list.classList.toggle('open');
}

// ─── Input Helpers ───────────────────────────────────
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion();
    }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
}

// ─── Toast ───────────────────────────────────────────
function showToast(message, type = '') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 3500);
}
