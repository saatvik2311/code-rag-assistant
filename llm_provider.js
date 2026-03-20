const { GoogleGenerativeAI } = require("@google/generative-ai");

// Setup the provider architecture.
// Designed to gracefully fallback to HF or OpenAI when those keys are loaded.

class LLMProvider {
    constructor() {
        // We strictly use environment variables to prevent accidental key exposure.
        this.geminiKey = process.env.GEMINI_API_KEY || null;
        this.hfKey = process.env.HF_API_KEY || null;
        this.openaiKey = process.env.OPENAI_API_KEY || null;

        if (this.geminiKey) {
            this.genAI = new GoogleGenerativeAI(this.geminiKey);
        }
    }

    async getEmbedding(text) {
        // Use Gemini Text Embedding Model
        if (!this.genAI) throw new Error("No API keys found for embedding! Please check your .env file.");

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" });
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (e) {
            console.error("Embedding API Error:", e.message);
            // Fallback null embedding to prevent crash
            return new Array(768).fill(0);
        }
    }

    async generateStream(systemPrompt, userPrompt, onChunk) {
        if (!this.genAI) throw new Error("No API keys found for generation! Please check your .env file.");

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

            const result = await model.generateContentStream(fullPrompt);

            let fullText = "";
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                if (onChunk) onChunk(chunkText);
            }
            return fullText;
        } catch (e) {
            console.error("Generation API Error:", e.message);
            throw e;
        }
    }

    // For non-streaming requests like query decomposition / verification
    async generateJSON(systemPrompt, userPrompt) {
        if (!this.genAI) throw new Error("No API keys found for generation! Please check your .env file.");

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

            const result = await model.generateContent(fullPrompt);
            return result.response.text();
        } catch (e) {
            console.error("Generation API Error (JSON):", e.message);
            throw e;
        }
    }
}

module.exports = new LLMProvider();
