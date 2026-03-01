# Vanta – Self-Diagnosing RAG Chatbot Builder

Vanta is a visual, no-code platform that allows users to generate, customize, and deploy Retrieval-Augmented Generation (RAG) chatbots in minutes.

Instead of manually wiring complex AI pipelines, users simply describe the chatbot they want. Vanta automatically generates a visual workflow that can be edited via drag-and-drop and deployed instantly.

---

## 🚀 Core Idea

Vanta simplifies AI development by combining:

- Plain English → Auto-generated RAG workflows
- Visual node-based editor
- One-click deployment with embeddable link
- Built-in diagnostic layer that explains failures in plain English

Our goal: Make AI chatbot creation accessible to everyone — not just developers.

---

## 🧠 Key Features (MVP)

### 1️⃣ Auto-Generated Workflows
Describe your chatbot in natural language and Vanta generates:
- Document ingestion pipeline
- Text chunking
- Embeddings
- Vector storage
- Language model connection
- Chat interface

### 2️⃣ Visual Node Editor
Users can:
- Drag and rearrange nodes
- Modify parameters (chunk size, model choice, etc.)
- Add or remove processing components

### 3️⃣ Self-Diagnosing Layer
When the chatbot fails, Vanta explains why:

Examples:
- "Your PDF has no extractable text. Enable OCR."
- "Chunk size may be too large. Try reducing it."
- "No relevant documents retrieved. Check similarity threshold."

### 4️⃣ One-Click Deployment
Deploy instantly and receive:
- Embeddable iframe
- Standalone chatbot link
- Optional exportable backend code

---

## 🏗 Architecture Overview

The system is structured into:

### Frontend
- Next.js (React)
- React Flow (visual workflow editor)
- TypeScript
- Tailwind CSS

### Backend
- FastAPI (Python)
- RAG pipeline logic
- WebSocket-based live preview
- Redis (session handling)

### AI & RAG Components
- LLM APIs (OpenAI / Claude compatible)
- Embedding models
- Vector storage (pgvector / FAISS / Chroma)

### Deployment
- Dockerized services
- Frontend & backend can be deployed independently
- Configurable for local or cloud execution

---

## 🔐 Privacy & Optimization

The system is designed with flexibility in mind:

- Supports local processing for sensitive data
- Designed to integrate with hardware-accelerated inference environments
- Optimized for scalable vector search

(Some integrations may vary depending on deployment environment.)

---

