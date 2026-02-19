// ─── Model Router ────────────────────────────────────
// Heuristic task classifier — zero LLM overhead
// Picks the best Ollama model for each query type

const MODEL_REGISTRY = {
    'qwen2.5-coder:1.5b': {
        name: 'Qwen2.5 Coder',
        size: '1.5B',
        strengths: ['code generation', 'completion', 'fast'],
        icon: '⚡',
        color: '#00b4d8'
    },
    'deepseek-coder-v2:lite': {
        name: 'DeepSeek Coder V2',
        size: '2.7B',
        strengths: ['code quality', 'debugging', 'refactoring'],
        icon: '🔬',
        color: '#7c3aed'
    },
    'phi3:mini': {
        name: 'Phi-3 Mini',
        size: '3.8B',
        strengths: ['reasoning', 'explanation', 'general'],
        icon: '🧠',
        color: '#10b981'
    },
    'deepseek-coder:6.7b': {
        name: 'DeepSeek Coder',
        size: '6.7B',
        strengths: ['code generation', 'multi-language', 'quality'],
        icon: '🎯',
        color: '#f59e0b'
    }
};

// ─── Task Patterns ───────────────────────────────────
const TASK_PATTERNS = [
    {
        name: 'code_generate',
        model: 'qwen2.5-coder:1.5b',
        patterns: [
            /\b(write|create|implement|build|make|code|generate|add)\b.*\b(function|class|method|api|endpoint|component|module|script|program)\b/i,
            /\b(write|create|implement)\b.*\b(in|using|with)\b.*\b(python|javascript|java|go|rust|typescript|c\+\+|ruby)\b/i,
            /\bhow to (write|create|implement|build|code)\b/i,
        ]
    },
    {
        name: 'debug',
        model: 'qwen2.5-coder:1.5b',
        patterns: [
            /\b(fix|debug|error|bug|issue|wrong|broken|fails?|crash|exception|traceback)\b/i,
            /\b(not working|doesn'?t work|won'?t compile|syntax error)\b/i,
            /\bwhy (does|is|am|do)\b.*\b(error|fail|wrong|broken)\b/i,
        ]
    },
    {
        name: 'explain',
        model: 'phi3:mini',
        patterns: [
            /\b(explain|what is|what are|how does|how do|why does|why is|describe|tell me about)\b/i,
            /\b(difference between|compare|vs\.?|versus)\b/i,
            /\b(concept|theory|principle|pattern|paradigm|architecture)\b/i,
        ]
    },
    {
        name: 'review',
        model: 'phi3:mini',
        patterns: [
            /\b(review|analyze|improve|optimize|refactor|clean up|best practice|suggest)\b/i,
            /\b(complexity|performance|efficiency|big[- ]?o|time complexity|space complexity)\b/i,
        ]
    },
    {
        name: 'complex_logic',
        model: 'deepseek-coder:6.7b',
        patterns: [
            /\b(architect|design|plan|strategy|roadmap|structure)\b/i,
            /\b(refactor|rewrite|migration|upgrade|security|audit)\b/i,
            /\b(multithreading|concurrency|async|await|deadlock|race condition)\b/i,
            /\b(optimize for|scalability|performance tuning)\b/i,
        ]
    },
    {
        name: 'research_swarm',
        model: 'phi3:mini', // Use Phi-3 for planning/reasoning as per architecture doc
        patterns: [
            /\b(research|investigate|find out|look up|search for)\b/i,
            /\b(compare|pros and cons|alternatives to|vs)\b/i,
            /\b(latest|newest|trends|state of the art|sota)\b/i,
        ]
    },
    {
        name: 'quick',
        model: 'qwen2.5-coder:1.5b',
        patterns: [
            /\b(convert|sort|reverse|filter|map|reduce|find|search|count|sum|max|min)\b/i,
            /\b(one[- ]?liner|snippet|example|sample|template|boilerplate)\b/i,
        ]
    }
];

const DEFAULT_MODEL = 'qwen2.5-coder:1.5b';

// ─── Router ──────────────────────────────────────────

function routeQuery(question) {
    const q = question.toLowerCase().trim();

    for (const task of TASK_PATTERNS) {
        for (const pattern of task.patterns) {
            if (pattern.test(q)) {
                return {
                    model: task.model,
                    task: task.name,
                    info: MODEL_REGISTRY[task.model] || { name: task.model, icon: '🤖' }
                };
            }
        }
    }

    return {
        model: DEFAULT_MODEL,
        task: 'general',
        info: MODEL_REGISTRY[DEFAULT_MODEL] || { name: DEFAULT_MODEL, icon: '🤖' }
    };
}

// ─── Check which models are actually pulled ──────────
async function getAvailableModels(ollamaUrl) {
    try {
        const res = await fetch(`${ollamaUrl}/api/tags`);
        const data = await res.json();
        const pulled = new Set(data.models.map(m => m.name));

        const models = {};
        for (const [id, info] of Object.entries(MODEL_REGISTRY)) {
            // Check exact match or base name match
            const available = pulled.has(id) ||
                [...pulled].some(p => p.startsWith(id.split(':')[0]));
            models[id] = { ...info, available, id };
        }

        return models;
    } catch (e) {
        return {};
    }
}

// ─── Smart route with fallback ───────────────────────
async function smartRoute(question, ollamaUrl) {
    const route = routeQuery(question);
    const models = await getAvailableModels(ollamaUrl);

    // If the chosen model is available, use it
    if (models[route.model]?.available) {
        return route;
    }

    // Fallback: find any available model
    const available = Object.entries(models)
        .filter(([_, info]) => info.available)
        .map(([id, info]) => ({ model: id, info, task: route.task }));

    if (available.length > 0) {
        return available[0];
    }

    // Last resort: return original choice (Ollama will error but that's fine)
    return route;
}

module.exports = {
    routeQuery,
    smartRoute,
    getAvailableModels,
    MODEL_REGISTRY,
    DEFAULT_MODEL
};
