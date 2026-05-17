# localchat

A self-hosted AI chat interface supporting **Groq cloud** and **local Ollama** models. Built with Next.js 14, deployable to Vercel in minutes.

## Features

- ⚡ Groq cloud — GPT-OSS 120B, Qwen3 32B, Llama 3.3 70B, and more
- 🦙 Ollama local — Qwen2.5-Coder, DeepSeek-R1, Llama 3.3, and more
- 🔄 Real-time streaming responses
- 💾 Persistent chat history (localStorage)
- 🔑 API key stays server-side (never exposed to browser)
- ⏹ Stop generation mid-stream
- 📋 Code block formatting

---

## Quick Start (local dev)

```bash
# 1. Clone and install
git clone https://github.com/yourname/localchat.git
cd localchat
npm install

# 2. Set up environment
cp .env.local.example .env.local
# Edit .env.local and add your GROQ_API_KEY

# 3. Run
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm i -g vercel
vercel

# Set your env vars:
vercel env add GROQ_API_KEY
# Paste your key when prompted

vercel --prod
```

### Option B — GitHub + Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo
4. Add environment variable: `GROQ_API_KEY = gsk_...`
5. Deploy

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (for Groq) | Get from [console.groq.com](https://console.groq.com) |
| `OLLAMA_BASE_URL` | No | Default: `http://localhost:11434` |

---

## Using with Ollama (local models)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull qwen2.5-coder:7b
# or
ollama pull llama3.3:70b

# Start Ollama
ollama serve

# In localchat: switch to Ollama tab, set URL to http://localhost:11434
```

> **Note:** When deployed to Vercel, Ollama must be on a publicly accessible server.
> For local use only, run `npm run dev` and point to `http://localhost:11434`.

---

## Use in Claude Code (bonus)

This project works as a drop-in chat UI. To also use Groq models in Claude Code directly:

```bash
export ANTHROPIC_BASE_URL="https://api.groq.com/openai/v1"
export ANTHROPIC_API_KEY="your_groq_key"
claude --model qwen/qwen3-32b
```

---

## Project Structure

```
localchat/
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts   ← serverless function (Groq + Ollama)
│   │   ├── page.tsx            ← main chat UI
│   │   ├── page.module.css     ← styles
│   │   ├── globals.css         ← global styles
│   │   └── layout.tsx          ← root layout
│   └── lib/
│       └── models.ts           ← model definitions
├── .env.local.example
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Adding More Models

Edit `src/lib/models.ts`:

```ts
export const GROQ_MODELS: Model[] = [
  { id: 'your-model-id', label: 'Your Model Name', provider: 'groq' },
  // ...
]
```

For Groq model IDs, check: [console.groq.com/docs/models](https://console.groq.com/docs/models)
For Ollama models: [ollama.com/library](https://ollama.com/library)
