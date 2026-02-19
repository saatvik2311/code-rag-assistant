/**
 * code_editor.js — AI-powered Code Editing Engine
 * Generates diffs, previews changes, applies edits with backup
 */

const fs = require('fs');
const path = require('path');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-coder:6.7b';

// ─── Diff Generation ─────────────────────────────────────────
async function generateEdit(filePath, instruction, context = '') {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
        throw new Error(`File not found: ${absPath}`);
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    const ext = path.extname(filePath);
    const lang = {
        '.js': 'JavaScript', '.ts': 'TypeScript', '.py': 'Python',
        '.java': 'Java', '.go': 'Go', '.rs': 'Rust', '.c': 'C',
        '.cpp': 'C++', '.rb': 'Ruby', '.php': 'PHP',
    }[ext] || 'code';

    const prompt = `You are a precise code editor. Given the following ${lang} file and an instruction, produce ONLY the modified version of the file. Do NOT include any explanation, just the complete modified code.

INSTRUCTION: ${instruction}

${context ? `CONTEXT: ${context}\n\n` : ''}ORIGINAL FILE (${path.basename(filePath)}):
\`\`\`
${content}
\`\`\`

OUTPUT the complete modified file content below. Only output the code, no markdown fences, no explanation:`;

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: LLM_MODEL,
            prompt,
            stream: false,
            options: { temperature: 0.1, top_p: 0.9, num_predict: 4096 }
        })
    });

    const data = await res.json();
    let newContent = data.response || '';

    // Clean up: remove markdown fences if present
    newContent = newContent.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '');

    // Generate a unified diff
    const diff = generateUnifiedDiff(content, newContent, path.basename(filePath));

    return {
        originalPath: absPath,
        originalContent: content,
        newContent: newContent.trim(),
        diff,
        instruction
    };
}

// ─── Unified Diff Generator ──────────────────────────────────
function generateUnifiedDiff(original, modified, filename) {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const diff = [];

    diff.push(`--- a/${filename}`);
    diff.push(`+++ b/${filename}`);

    // Simple line-by-line diff using LCS approach
    const lcs = computeLCS(origLines, modLines);
    let oi = 0, mi = 0, li = 0;
    let hunkLines = [];
    let hunkStartOrig = 1, hunkStartMod = 1;
    let origCount = 0, modCount = 0;

    function flushHunk() {
        if (hunkLines.length > 0) {
            diff.push(`@@ -${hunkStartOrig},${origCount} +${hunkStartMod},${modCount} @@`);
            diff.push(...hunkLines);
            hunkLines = [];
            origCount = 0;
            modCount = 0;
        }
    }

    while (oi < origLines.length || mi < modLines.length) {
        if (li < lcs.length && oi < origLines.length && mi < modLines.length &&
            origLines[oi] === lcs[li] && modLines[mi] === lcs[li]) {
            // Common line
            if (hunkLines.length > 0) {
                hunkLines.push(` ${origLines[oi]}`);
                origCount++;
                modCount++;
            }
            oi++; mi++; li++;
        } else if (oi < origLines.length && (li >= lcs.length || origLines[oi] !== lcs[li])) {
            // Removed line
            if (hunkLines.length === 0) {
                hunkStartOrig = oi + 1;
                hunkStartMod = mi + 1;
            }
            hunkLines.push(`-${origLines[oi]}`);
            origCount++;
            oi++;
        } else if (mi < modLines.length && (li >= lcs.length || modLines[mi] !== lcs[li])) {
            // Added line
            if (hunkLines.length === 0) {
                hunkStartOrig = oi + 1;
                hunkStartMod = mi + 1;
            }
            hunkLines.push(`+${modLines[mi]}`);
            modCount++;
            mi++;
        }

        // Flush hunk after context
        if (hunkLines.length > 0 && hunkLines[hunkLines.length - 1].startsWith(' ')) {
            const contextCount = hunkLines.filter(l => l.startsWith(' ')).length;
            if (contextCount >= 3) flushHunk();
        }
    }

    flushHunk();
    return diff.join('\n');
}

// Simple LCS for diffing
function computeLCS(a, b) {
    const m = a.length, n = b.length;
    // For very large files, use a simplified approach
    if (m * n > 1000000) {
        return simpleLCS(a, b);
    }

    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack
    const result = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            result.unshift(a[i - 1]);
            i--; j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    return result;
}

// Simplified LCS for large files
function simpleLCS(a, b) {
    const bSet = new Set(b);
    return a.filter(line => bSet.has(line));
}

// ─── Apply Edit ──────────────────────────────────────────────
function applyEdit(filePath, newContent) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
        throw new Error(`File not found: ${absPath}`);
    }

    // Create backup
    const backupPath = absPath + '.bak';
    const originalContent = fs.readFileSync(absPath, 'utf-8');
    fs.writeFileSync(backupPath, originalContent);

    // Write new content
    fs.writeFileSync(absPath, newContent);

    return {
        applied: true,
        backupPath,
        originalPath: absPath,
        originalLines: originalContent.split('\n').length,
        newLines: newContent.split('\n').length
    };
}

// ─── Revert Edit ─────────────────────────────────────────────
function revertEdit(filePath) {
    const absPath = path.resolve(filePath);
    const backupPath = absPath + '.bak';

    if (!fs.existsSync(backupPath)) {
        throw new Error(`No backup found: ${backupPath}`);
    }

    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    fs.writeFileSync(absPath, backupContent);
    fs.unlinkSync(backupPath);

    return { reverted: true, path: absPath };
}

// ─── Preview Edit (colorized for terminal) ───────────────────
function formatDiffForTerminal(diff) {
    const C = {
        reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
        cyan: '\x1b[36m', dim: '\x1b[2m',
    };

    return diff.split('\n').map(line => {
        if (line.startsWith('+++') || line.startsWith('---')) return `${C.cyan}${line}${C.reset}`;
        if (line.startsWith('@@')) return `${C.cyan}${line}${C.reset}`;
        if (line.startsWith('+')) return `${C.green}${line}${C.reset}`;
        if (line.startsWith('-')) return `${C.red}${line}${C.reset}`;
        return `${C.dim}${line}${C.reset}`;
    }).join('\n');
}

module.exports = {
    generateEdit,
    applyEdit,
    revertEdit,
    generateUnifiedDiff,
    formatDiffForTerminal
};
