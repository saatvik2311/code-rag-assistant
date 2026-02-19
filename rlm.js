/**
 * rlm.js — Retrieval-augmented Language Model Pipeline
 * Hybrid retrieval, query decomposition, adaptive context, self-reflection
 */

// ─── Hybrid Retrieval ────────────────────────────────────────
function hybridSearch(vectorStore, queryEmbedding, query, options = {}) {
    const {
        topK = 6,
        semanticWeight = 0.50,
        keywordWeight = 0.20,
        recencyWeight = 0.15,
        diversityWeight = 0.15,
    } = options;

    const stopWords = new Set([
        'how', 'does', 'what', 'is', 'the', 'a', 'an', 'in', 'to', 'of',
        'for', 'and', 'or', 'with', 'can', 'you', 'i', 'me', 'my', 'do',
        'write', 'explain', 'show', 'give', 'using', 'use', 'implement',
        'create', 'make', 'build', 'this', 'that', 'it', 'be', 'are',
        'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
        'will', 'would', 'could', 'should', 'may', 'might', 'shall',
    ]);

    const keywords = query.toLowerCase().split(/\W+/)
        .filter(w => w.length > 1 && !stopWords.has(w));

    // Score each chunk
    const scored = vectorStore.map((chunk, index) => {
        // 1. Semantic similarity
        const semantic = cosineSimilarity(queryEmbedding, chunk.embedding);

        // 2. Keyword matching (with bonus for exact phrases)
        const text = (chunk.content + ' ' + chunk.source).toLowerCase();
        let keywordHits = 0;
        let phraseBonus = 0;
        for (const kw of keywords) {
            if (text.includes(kw)) keywordHits++;
        }
        // Check for multi-word phrase match
        const queryLower = query.toLowerCase();
        if (queryLower.length > 5 && text.includes(queryLower.substring(0, 20))) {
            phraseBonus = 0.3;
        }
        const keywordScore = keywords.length > 0
            ? (keywordHits / keywords.length) + phraseBonus
            : 0;

        // 3. Recency (favor higher index = more recently added)
        const recencyScore = vectorStore.length > 1
            ? index / (vectorStore.length - 1)
            : 0.5;

        // 4. Source diversity will be handled post-scoring
        const score = semanticWeight * semantic
            + keywordWeight * Math.min(1, keywordScore)
            + recencyWeight * recencyScore;

        return { ...chunk, score, semantic, keywordScore, recencyScore };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Apply diversity: penalize chunks from same source after first
    const seenSources = {};
    const diversified = [];
    for (const chunk of scored) {
        const src = chunk.source;
        const count = seenSources[src] || 0;
        const diversityPenalty = count * diversityWeight;
        const adjustedScore = chunk.score - diversityPenalty;
        seenSources[src] = count + 1;
        diversified.push({ ...chunk, score: adjustedScore, rawScore: chunk.score });
    }

    diversified.sort((a, b) => b.score - a.score);
    return diversified.slice(0, topK);
}

function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

// ─── Query Decomposition ─────────────────────────────────────
async function decomposeQuery(query, ollamaUrl, model) {
    // Only decompose complex queries
    const wordCount = query.split(/\s+/).length;
    if (wordCount < 8) return [query]; // simple query, no decomposition

    try {
        const res = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: `Break this complex coding question into 2-3 simpler sub-questions that can be searched independently. Return ONLY the sub-questions, one per line, no numbering or bullets:

Question: ${query}

Sub-questions:`,
                stream: false,
                options: { temperature: 0.1, num_predict: 200 }
            })
        });
        const data = await res.json();
        const subQueries = (data.response || '')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 5 && !l.match(/^[\d\-\*\.]+$/))
            .slice(0, 3);

        return subQueries.length > 0 ? subQueries : [query];
    } catch (e) {
        return [query];
    }
}

// ─── Adaptive Context Window ─────────────────────────────────
function buildAdaptiveContext(results, maxTokens = 3000) {
    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const tokenEstimate = (text) => Math.ceil(text.length / 4);

    let totalTokens = 0;
    const included = [];

    // Always include top results. Include more if scores are close
    const topScore = results[0]?.score || 0;
    const threshold = topScore * 0.5; // include if within 50% of top score

    for (const result of results) {
        if (result.score < threshold && included.length >= 2) break;

        const tokens = tokenEstimate(result.content);
        if (totalTokens + tokens > maxTokens && included.length >= 2) break;

        included.push(result);
        totalTokens += tokens;
    }

    return included;
}

// ─── Self-Reflection / Verification ──────────────────────────
async function verifyAnswer(answer, sources, question, ollamaUrl, model) {
    try {
        const sourceText = sources.map(s => s.content.substring(0, 200)).join('\n');
        const res = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: `Rate the following answer's accuracy on a scale of 1-10 based on the source documentation. Reply with ONLY a JSON object like: {"confidence": 8, "issues": "none"}

Question: ${question}
Sources: ${sourceText.substring(0, 500)}
Answer: ${answer.substring(0, 800)}

Rating:`,
                stream: false,
                options: { temperature: 0.1, num_predict: 100 }
            })
        });
        const data = await res.json();
        const responseText = data.response || '';

        // Try to parse JSON from response
        const jsonMatch = responseText.match(/\{[^}]+\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    confidence: Math.min(10, Math.max(1, parseInt(parsed.confidence) || 5)),
                    issues: parsed.issues || 'none',
                    verified: true
                };
            } catch (e) { /* fall through */ }
        }

        // Fallback: extract number
        const numMatch = responseText.match(/(\d+)/);
        return {
            confidence: numMatch ? Math.min(10, Math.max(1, parseInt(numMatch[1]))) : 5,
            issues: 'none',
            verified: true
        };
    } catch (e) {
        return { confidence: 5, issues: 'Verification unavailable', verified: false };
    }
}

// ─── Confidence Score Calculation ─────────────────────────────
function calculateConfidence(results) {
    if (results.length === 0) return { score: 0, level: 'none', label: 'No sources' };

    // Average relevance of top results
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // Source diversity (more diverse = higher confidence)
    const uniqueSources = new Set(results.map(r => r.source)).size;
    const diversityBonus = Math.min(0.2, uniqueSources * 0.05);

    // Coverage (are top scores high?)
    const topScore = results[0].score;

    const confidence = Math.min(1, (avgScore * 0.6 + topScore * 0.2 + diversityBonus + 0.1));
    const pct = Math.round(confidence * 100);

    let level, label;
    if (pct >= 80) { level = 'high'; label = '🟢 High confidence'; }
    else if (pct >= 50) { level = 'medium'; label = '🟡 Medium confidence'; }
    else { level = 'low'; label = '🔴 Low confidence'; }

    return { score: pct, level, label };
}

// ─── Full RLM Pipeline ───────────────────────────────────────
async function rlmRetrieve(vectorStore, query, getEmbedding, ollamaUrl, model, options = {}) {
    const {
        enableDecomposition = true,
        enableVerification = false, // off by default for speed, can be toggled
        maxContextTokens = 3000,
    } = options;

    // 1. Query decomposition (for complex queries)
    let subQueries = [query];
    if (enableDecomposition) {
        subQueries = await decomposeQuery(query, ollamaUrl, model);
    }

    // 2. Retrieve for each sub-query
    let allResults = [];
    for (const sq of subQueries) {
        const embedding = await getEmbedding(sq);
        const results = hybridSearch(vectorStore, embedding, sq, { topK: 6 });
        allResults = allResults.concat(results);
    }

    // 3. Deduplicate by chunk id
    const seen = new Set();
    const unique = [];
    for (const r of allResults) {
        if (!seen.has(r.id)) {
            seen.add(r.id);
            unique.push(r);
        }
    }
    unique.sort((a, b) => b.score - a.score);

    // 4. Adaptive context window
    const contextChunks = buildAdaptiveContext(unique, maxContextTokens);

    // 5. Confidence calculation
    const confidence = calculateConfidence(contextChunks);

    return {
        chunks: contextChunks,
        confidence,
        subQueries,
        totalCandidates: vectorStore.length,
        retrieved: contextChunks.length,
    };
}

module.exports = {
    hybridSearch,
    decomposeQuery,
    buildAdaptiveContext,
    verifyAnswer,
    calculateConfidence,
    rlmRetrieve,
    cosineSimilarity
};
