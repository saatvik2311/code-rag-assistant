/**
 * repo_scanner.js — Repository Analysis Engine
 * Recursively scans codebases, detects languages, extracts structure
 */

const fs = require('fs');
const path = require('path');

// ─── Language Detection ──────────────────────────────────────
const LANG_MAP = {
    '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.ts': 'typescript', '.tsx': 'typescript', '.jsx': 'javascript',
    '.py': 'python', '.pyw': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c', '.h': 'c',
    '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin', '.kts': 'kotlin',
    '.cs': 'csharp',
    '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.toml': 'toml',
    '.sql': 'sql',
    '.html': 'html', '.htm': 'html',
    '.css': 'css', '.scss': 'scss',
    '.xml': 'xml',
};

const CODE_EXTENSIONS = new Set([
    '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
    '.py', '.pyw', '.java', '.go', '.rs',
    '.c', '.h', '.cpp', '.cc', '.cxx', '.hpp',
    '.rb', '.php', '.swift', '.kt', '.kts', '.cs',
    '.sh', '.bash', '.zsh', '.sql',
    '.html', '.htm', '.css', '.scss', '.xml',
    '.md', '.json', '.yaml', '.yml', '.toml',
]);

// Directories to always skip
const SKIP_DIRS = new Set([
    'node_modules', '.git', '.svn', '.hg', '__pycache__', '.pytest_cache',
    '.mypy_cache', '.tox', '.eggs', '*.egg-info', 'dist', 'build',
    '.next', '.nuxt', '.output', 'vendor', 'target', 'bin', 'obj',
    '.idea', '.vscode', '.vs', 'coverage', '.nyc_output',
]);

// ─── Gitignore Parser (simple) ───────────────────────────────
function loadGitignore(repoPath) {
    const ignorePath = path.join(repoPath, '.gitignore');
    if (!fs.existsSync(ignorePath)) return [];
    const content = fs.readFileSync(ignorePath, 'utf-8');
    return content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
}

function isIgnored(filePath, repoPath, ignorePatterns) {
    const rel = path.relative(repoPath, filePath);
    for (const pattern of ignorePatterns) {
        // Simple glob matching
        const clean = pattern.replace(/^\//, '').replace(/\/$/, '');
        if (rel.includes(clean) || rel.startsWith(clean)) return true;
    }
    return false;
}

// ─── Smart Code Chunking ─────────────────────────────────────
// Splits code at function/class boundaries using regex heuristics
function chunkCode(content, source, lang, chunkSize = 800, overlap = 100) {
    const chunks = [];
    const lines = content.split('\n');

    // Function/class boundary patterns by language
    const boundaryPatterns = {
        javascript: /^(export\s+)?(async\s+)?function\s+|^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(|^(export\s+)?class\s+|^(export\s+default\s+)/,
        typescript: /^(export\s+)?(async\s+)?function\s+|^(export\s+)?(const|let|var)\s+\w+\s*[=:]\s*|^(export\s+)?class\s+|^(export\s+)?interface\s+|^(export\s+)?type\s+/,
        python: /^(async\s+)?def\s+|^class\s+|^@\w+/,
        java: /^\s*(public|private|protected|static|\s)+[\w<>\[\]]+\s+\w+\s*\(|^\s*(public|private|protected)?\s*class\s+|^\s*(public|private|protected)?\s*interface\s+/,
        go: /^func\s+|^type\s+\w+\s+(struct|interface)/,
        rust: /^(pub\s+)?(fn|struct|enum|trait|impl|mod)\s+/,
        c: /^(\w+\s+)+\w+\s*\(|^(typedef\s+)?(struct|enum|union)\s+/,
        cpp: /^(\w+\s+)+\w+\s*\(|^(class|struct|namespace|template)\s+/,
        ruby: /^(def|class|module)\s+/,
        php: /^(public|private|protected)?\s*(static\s+)?function\s+|^class\s+/,
        csharp: /^\s*(public|private|protected|internal|static|\s)+[\w<>\[\]]+\s+\w+\s*\(|^\s*(public|private)?\s*class\s+/,
        kotlin: /^(fun|class|interface|object|data\s+class)\s+/,
        swift: /^(func|class|struct|enum|protocol|extension)\s+/,
    };

    const pattern = boundaryPatterns[lang];
    let current = '';
    let idx = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();

        // Check if this line is a boundary (function/class start)
        const isBoundary = pattern && pattern.test(trimmed) && current.length > 200;

        if ((current.length + line.length > chunkSize && current.length > 0) || isBoundary) {
            chunks.push({
                id: `${source}_${idx}`,
                source,
                language: lang,
                content: current.trim(),
                lineStart: i - current.split('\n').length + 1,
                lineEnd: i,
                embedding: null
            });
            idx++;
            // Keep overlap
            const words = current.split('\n');
            const overlapLines = words.slice(-Math.floor(overlap / 20));
            current = overlapLines.join('\n') + '\n' + line;
        } else {
            current += (current ? '\n' : '') + line;
        }
    }

    if (current.trim()) {
        chunks.push({
            id: `${source}_${idx}`,
            source,
            language: lang,
            content: current.trim(),
            lineStart: Math.max(0, lines.length - current.split('\n').length),
            lineEnd: lines.length - 1,
            embedding: null
        });
    }

    return chunks;
}

// ─── Import/Dependency Extraction ────────────────────────────
function extractImports(content, lang) {
    const imports = [];
    const patterns = {
        javascript: [
            /require\(['"]([^'"]+)['"]\)/g,
            /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
            /import\s+['"]([^'"]+)['"]/g,
        ],
        typescript: [
            /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
            /import\s+['"]([^'"]+)['"]/g,
        ],
        python: [
            /^import\s+(\S+)/gm,
            /^from\s+(\S+)\s+import/gm,
        ],
        java: [
            /^import\s+([\w.]+);/gm,
        ],
        go: [
            /"([^"]+)"/g, // inside import blocks
        ],
        rust: [
            /^use\s+([\w:]+)/gm,
        ],
        c: [
            /#include\s*[<"]([^>"]+)[>"]/g,
        ],
        cpp: [
            /#include\s*[<"]([^>"]+)[>"]/g,
        ],
    };

    const langPatterns = patterns[lang] || [];
    for (const pat of langPatterns) {
        let match;
        const regex = new RegExp(pat.source, pat.flags);
        while ((match = regex.exec(content)) !== null) {
            if (match[1]) imports.push(match[1]);
        }
    }

    return [...new Set(imports)];
}

// ─── Symbol Extraction ───────────────────────────────────────
function extractSymbols(content, lang) {
    const symbols = { functions: [], classes: [], exports: [] };

    const functionPatterns = {
        javascript: /(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
        typescript: /(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*[=:]/g,
        python: /(?:async\s+)?def\s+(\w+)/g,
        java: /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(/g,
        go: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/g,
        rust: /fn\s+(\w+)/g,
    };

    const classPatterns = {
        javascript: /class\s+(\w+)/g,
        typescript: /(?:class|interface|type)\s+(\w+)/g,
        python: /class\s+(\w+)/g,
        java: /(?:class|interface|enum)\s+(\w+)/g,
        go: /type\s+(\w+)\s+(?:struct|interface)/g,
        rust: /(?:struct|enum|trait)\s+(\w+)/g,
    };

    const fnPat = functionPatterns[lang];
    if (fnPat) {
        const regex = new RegExp(fnPat.source, fnPat.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
            const name = match[1] || match[2];
            if (name && !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(name)) {
                symbols.functions.push(name);
            }
        }
    }

    const clsPat = classPatterns[lang];
    if (clsPat) {
        const regex = new RegExp(clsPat.source, clsPat.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
            if (match[1]) symbols.classes.push(match[1]);
        }
    }

    return symbols;
}

// ─── Main Scanner ────────────────────────────────────────────
function scanRepo(repoPath, options = {}) {
    const maxFileSize = options.maxFileSize || 500 * 1024; // 500KB
    const maxFiles = options.maxFiles || 1000;
    const ignorePatterns = loadGitignore(repoPath);

    const result = {
        path: repoPath,
        name: path.basename(repoPath),
        fileTree: [],
        languageStats: {},
        totalFiles: 0,
        totalLines: 0,
        chunks: [],
        imports: {},
        symbols: {},
    };

    let fileCount = 0;

    function walk(dir, depth = 0) {
        if (depth > 15 || fileCount >= maxFiles) return;

        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) { return; }

        for (const entry of entries) {
            if (fileCount >= maxFiles) break;

            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(repoPath, fullPath);

            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
                if (isIgnored(fullPath, repoPath, ignorePatterns)) continue;

                result.fileTree.push({ path: relPath, type: 'dir', depth });
                walk(fullPath, depth + 1);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (!CODE_EXTENSIONS.has(ext)) continue;
                if (isIgnored(fullPath, repoPath, ignorePatterns)) continue;

                let stat;
                try { stat = fs.statSync(fullPath); } catch (e) { continue; }
                if (stat.size > maxFileSize || stat.size === 0) continue;

                const lang = LANG_MAP[ext] || 'unknown';
                result.languageStats[lang] = (result.languageStats[lang] || 0) + 1;

                let content;
                try { content = fs.readFileSync(fullPath, 'utf-8'); } catch (e) { continue; }

                const lineCount = content.split('\n').length;
                result.totalLines += lineCount;

                result.fileTree.push({
                    path: relPath,
                    type: 'file',
                    language: lang,
                    lines: lineCount,
                    size: stat.size,
                    depth
                });

                // Smart chunking
                const fileChunks = chunkCode(content, relPath, lang);
                result.chunks = result.chunks.concat(fileChunks);

                // Extract imports and symbols
                const fileImports = extractImports(content, lang);
                if (fileImports.length > 0) result.imports[relPath] = fileImports;

                const fileSymbols = extractSymbols(content, lang);
                if (fileSymbols.functions.length > 0 || fileSymbols.classes.length > 0) {
                    result.symbols[relPath] = fileSymbols;
                }

                fileCount++;
                result.totalFiles++;
            }
        }
    }

    walk(repoPath);
    return result;
}

module.exports = { scanRepo, chunkCode, extractImports, extractSymbols, LANG_MAP, CODE_EXTENSIONS };
