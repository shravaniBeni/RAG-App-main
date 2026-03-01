import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Workflow Templates ────────────────────────────────────────────────────────
// Used as fallback if AI generation fails, or as seed examples.

const WORKFLOW_TEMPLATES = {
  pdf_chatbot: {
    name: "PDF Q&A Chatbot",
    nodes: [
      { id: "1", type: "fileInput",   position: { x: 60,  y: 180 }, data: { label: "PDF Upload",      description: "Accept PDF file uploads from users",              icon: "📄", color: "#3b82f6", params: { accept: ".pdf", multiple: "false" } } },
      { id: "2", type: "processor",   position: { x: 300, y: 180 }, data: { label: "PDF Extractor",   description: "Extract raw text content from PDF pages",         icon: "🔍", color: "#06b6d4", params: { engine: "pdf-parse", preserveLayout: "false" } } },
      { id: "3", type: "processor",   position: { x: 540, y: 180 }, data: { label: "Text Splitter",   description: "Chunk text into overlapping segments",            icon: "✂️", color: "#8b5cf6", params: { chunkSize: "1000", chunkOverlap: "200", separator: "\\n\\n" } } },
      { id: "4", type: "embeddings",  position: { x: 780, y: 180 }, data: { label: "Embeddings",      description: "Convert chunks to vectors via OpenAI",            icon: "🧬", color: "#f59e0b", params: { model: "text-embedding-3-small", batchSize: "100" } } },
      { id: "5", type: "vectorStore", position: { x: 780, y: 380 }, data: { label: "Vector Store",    description: "Index and store vectors for similarity search",   icon: "🗄️", color: "#10b981", params: { provider: "pinecone", index: "rag-index", metric: "cosine" } } },
      { id: "6", type: "retriever",   position: { x: 540, y: 380 }, data: { label: "Retriever",       description: "Find top-K most relevant chunks for the query",   icon: "🎯", color: "#f97316", params: { topK: "5", scoreThreshold: "0.7" } } },
      { id: "7", type: "llm",         position: { x: 300, y: 380 }, data: { label: "LLM (GPT-4o)",   description: "Generate a grounded answer from retrieved context","icon": "🧠", color: "#ec4899", params: { model: "gpt-4o", temperature: "0.2", maxTokens: "1000", systemPrompt: "You are a helpful assistant. Answer based on the provided context only." } } },
      { id: "8", type: "chatUI",      position: { x: 60,  y: 380 }, data: { label: "Chat UI",         description: "Render the conversational interface",             icon: "💬", color: "#6366f1", params: { theme: "dark", placeholder: "Ask about your PDF...", streamResponse: "true" } } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-3", source: "2", target: "3", animated: true },
      { id: "e3-4", source: "3", target: "4", animated: true },
      { id: "e4-5", source: "4", target: "5", animated: true },
      { id: "e5-6", source: "5", target: "6", animated: true },
      { id: "e6-7", source: "6", target: "7", animated: true },
      { id: "e7-8", source: "7", target: "8", animated: true },
    ],
  },
};

// ─── AI Workflow Generator ─────────────────────────────────────────────────────

async function generateWorkflowWithAI(prompt) {
  const systemPrompt = `You are an expert RAG (Retrieval-Augmented Generation) application architect.
Given a user's description of their desired RAG app, generate a workflow as a JSON object.

The workflow must have:
- "name": string — short app name
- "description": string — one line summary  
- "nodes": array of node objects
- "edges": array of edge objects connecting nodes

Each NODE must have:
{
  "id": "1",  // sequential string numbers
  "type": one of ["fileInput", "apiInput", "webScraper", "processor", "embeddings", "vectorStore", "retriever", "llm", "chatUI", "output"],
  "position": { "x": number, "y": number },  // layout: x from 60 to 900, y alternating 180 and 380
  "data": {
    "label": "short name",
    "description": "what this node does",
    "icon": "relevant emoji",
    "color": "hex color — pick from: #3b82f6 #06b6d4 #8b5cf6 #f59e0b #10b981 #f97316 #ec4899 #6366f1 #14b8a6 #a855f7",
    "params": { key: "value" }  // 2-5 relevant configuration params
  }
}

Each EDGE must have: { "id": "e1-2", "source": "1", "target": "2", "animated": true }

Layout rule: place nodes left-to-right in two rows (y=180 top row, y=380 bottom row), x spacing ~240px.
Start with ingestion pipeline (top row, left to right), then retrieval/generation (bottom row, right to left), ending in output.

IMPORTANT: Respond with ONLY valid JSON. No markdown, no explanation, just the JSON object.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: `Generate a RAG workflow for: ${prompt}` }],
    system: systemPrompt,
  });

  const text = response.content[0].text.trim();
  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean);
}

// ─── Code Generator ────────────────────────────────────────────────────────────

function generateCode(workflow, keys = {}) {
  const openaiKey  = keys.openai  || "REPLACE_WITH_YOUR_OPENAI_KEY";
  const pineconeKey = keys.pinecone || "REPLACE_WITH_YOUR_PINECONE_KEY";

  const nodeList = workflow.nodes.map(n => `  - ${n.data.label}: ${n.data.description}`).join("\n");

  const serverJs = `/**
 * ${workflow.name || "RAG App"} — Generated by RAG Builder
 * 
 * Workflow nodes:
${nodeList}
 */
import express from "express";
import cors from "cors";
import multer from "multer";
import pdf from "pdf-parse";
import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ── Config ─────────────────────────────────────────────────────────────────────
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY   || "${openaiKey}";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "${pineconeKey}";
const INDEX_NAME       = "rag-app-index";
const EMBEDDING_MODEL  = "text-embedding-3-small";
const CHAT_MODEL       = "gpt-4o";

// ── Clients ────────────────────────────────────────────────────────────────────
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

// Ensure index exists
async function ensureIndex() {
  const existing = await pinecone.listIndexes();
  const names = existing.indexes?.map(i => i.name) || [];
  if (!names.includes(INDEX_NAME)) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 1536,
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    });
    // Wait for index to be ready
    await new Promise(r => setTimeout(r, 10000));
  }
  return pinecone.index(INDEX_NAME);
}

let vectorIndex;
ensureIndex().then(idx => { vectorIndex = idx; console.log("✓ Pinecone index ready"); });

// ── Upload ─────────────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // 1. Extract text from PDF
    const pdfData = await pdf(req.file.buffer);
    const rawText = pdfData.text;

    // 2. Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(rawText);

    // 3. Embed chunks
    const embeddingRes = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: chunks,
    });

    // 4. Upsert into Pinecone
    const vectors = embeddingRes.data.map((e, i) => ({
      id: \`chunk-\${Date.now()}-\${i}\`,
      values: e.embedding,
      metadata: { text: chunks[i], source: req.file.originalname },
    }));
    await vectorIndex.upsert(vectors);

    res.json({ ok: true, chunks: chunks.length, filename: req.file.originalname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Chat ───────────────────────────────────────────────────────────────────────
const chatHistories = {};

app.post("/chat", async (req, res) => {
  const { question, sessionId = "default" } = req.body;
  if (!chatHistories[sessionId]) chatHistories[sessionId] = [];

  try {
    // 1. Embed the question
    const queryEmbed = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });

    // 2. Retrieve top-K relevant chunks
    const results = await vectorIndex.query({
      vector: queryEmbed.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });
    const context = results.matches
      .filter(m => m.score > 0.5)
      .map(m => m.metadata.text)
      .join("\\n\\n---\\n\\n");

    // 3. Build messages with history
    const messages = [
      {
        role: "system",
        content: \`You are a helpful assistant. Answer questions based on the provided context.
If the answer isn't in the context, say so honestly.

CONTEXT:
\${context || "No relevant context found."}\`,
      },
      ...chatHistories[sessionId].slice(-6),
      { role: "user", content: question },
    ];

    // 4. Stream the response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");

    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 1000,
      stream: true,
    });

    let fullAnswer = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullAnswer += delta;
        res.write(\`data: \${JSON.stringify({ delta })}\n\n\`);
      }
    }
    res.write(\`data: [DONE]\n\n\`);
    res.end();

    // Save to history
    chatHistories[sessionId].push({ role: "user", content: question });
    chatHistories[sessionId].push({ role: "assistant", content: fullAnswer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(3001, () => console.log("🚀 RAG app running on http://localhost:3001"));
`;

  const packageJson = `{
  "name": "rag-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "start": "node server.js", "dev": "node --watch server.js" },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "openai": "^4.47.0",
    "@pinecone-database/pinecone": "^2.2.2",
    "langchain": "^0.2.5"
  }
}`;

  const dockerfile = `FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN mkdir -p public
EXPOSE 3001
CMD ["node", "server.js"]`;

  const envExample = `OPENAI_API_KEY=${openaiKey}
PINECONE_API_KEY=${pineconeKey}`;

  return { serverJs, packageJson, dockerfile, envExample };
}

// ─── Main /generate Endpoint ───────────────────────────────────────────────────

app.post("/generate", async (req, res) => {
  const { prompt, openai_api_key, pinecone_api_key } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

  const appId = uuidv4().slice(0, 8);

  let workflow;
  let aiUsed = false;

  // Try AI generation first
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      workflow = await generateWorkflowWithAI(prompt);
      aiUsed = true;
    } else {
      throw new Error("No ANTHROPIC_API_KEY");
    }
  } catch (err) {
    console.warn("AI generation failed, using template:", err.message);
    workflow = WORKFLOW_TEMPLATES.pdf_chatbot;
  }

  // Generate code
  const code = generateCode(workflow, {
    openai: openai_api_key,
    pinecone: pinecone_api_key,
  });

  const embedUrl  = `http://localhost:3001`;
  const embedCode = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="650px"\n  frameborder="0"\n  allow="clipboard-write"\n  title="${workflow.name || "RAG Chatbot"}"\n></iframe>`;

  res.json({
    appId,
    aiUsed,
    workflow,
    code,
    embedUrl,
    embedCode,
    status: "code_ready",
  });
});

app.get("/health", (_, res) => res.json({ status: "ok", version: "2.0" }));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 RAG Builder API → http://localhost:${PORT}`));
;
