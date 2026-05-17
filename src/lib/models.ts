export type Provider = 'groq' | 'ollama'

export interface Model {
  id: string
  label: string
  provider: Provider
}

export const GROQ_MODELS: Model[] = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B · best quality', provider: 'groq' },
  { id: 'qwen/qwen3-32b', label: 'Qwen3 32B · reasoning', provider: 'groq' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B · versatile', provider: 'groq' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', provider: 'groq' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B · fastest 922t/s', provider: 'groq' },
  { id: 'qwen2.5-coder-7b-instruct', label: 'Qwen2.5-Coder 7B', provider: 'groq' },
]

export const OLLAMA_MODELS: Model[] = [
  { id: 'qwen2.5-coder:7b', label: 'Qwen2.5-Coder 7B', provider: 'ollama' },
  { id: 'cieloforge/qwen2.5-coder-7b-instruct-spec', label: 'Qwen2.5-Coder 7B Spec', provider: 'ollama' },
  { id: 'qwen2.5-coder:32b', label: 'Qwen2.5-Coder 32B', provider: 'ollama' },
  { id: 'deepseek-r1:70b', label: 'DeepSeek-R1 70B', provider: 'ollama' },
  { id: 'llama3.3:70b', label: 'Llama 3.3 70B', provider: 'ollama' },
  { id: 'llama3.1:8b', label: 'Llama 3.1 8B · fast', provider: 'ollama' },
]

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  provider?: Provider
  model?: string
  timestamp: number
}
