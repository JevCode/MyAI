'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { GROQ_MODELS, OLLAMA_MODELS, type Message, type Provider } from '@/lib/models'
import styles from './page.module.css'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function renderContent(text: string) {
  const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const withCode = escaped.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) => `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`
  )
  const withInline = withCode.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  const withBold = withInline.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  return withBold
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [provider, setProvider] = useState<Provider>('groq')
  const [model, setModel] = useState(GROQ_MODELS[0].id)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState('')
  const [tokenCount, setTokenCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const models = provider === 'groq' ? GROQ_MODELS : OLLAMA_MODELS

  useEffect(() => {
    try {
      const saved = localStorage.getItem('localchat_v2')
      if (saved) {
        const data = JSON.parse(saved)
        setMessages(data.messages || [])
        setProvider(data.provider || 'groq')
        setModel(data.model || GROQ_MODELS[0].id)
        setOllamaUrl(data.ollamaUrl || 'http://localhost:11434')
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('localchat_v2', JSON.stringify({
        messages: messages.slice(-60),
        provider, model, ollamaUrl,
      }))
    } catch {}
  }, [messages, provider, model, ollamaUrl])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleProviderSwitch = (p: Provider) => {
    setProvider(p)
    const newModels = p === 'groq' ? GROQ_MODELS : OLLAMA_MODELS
    setModel(newModels[0].id)
  }

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const clearError = () => setError('')

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim()
    if (!content || isLoading) return
    clearError()

    const userMsg: Message = { id: generateId(), role: 'user', content, timestamp: Date.now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setStreamingContent('')
    setIsLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          model,
          provider,
          ollamaUrl,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).error || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              const delta = json.choices?.[0]?.delta?.content || ''
              accumulated += delta
              setStreamingContent(accumulated)
            } catch {}
          }
        }
      }

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: accumulated,
        provider,
        model,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setTokenCount(Math.round(accumulated.length / 4))
      setStreamingContent('')
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Something went wrong')
      }
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, model, provider, ollamaUrl, isLoading])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
  }

  const clearChat = () => {
    setMessages([])
    setStreamingContent('')
    setTokenCount(0)
    setError('')
  }

  const modelLabel = models.find(m => m.id === model)?.label || model

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>AI</div>
          <span className={styles.logoText}>localchat <em>/dev</em></span>
        </div>
        <div className={styles.controls}>
          <div className={styles.providerToggle}>
            <button
              className={`${styles.providerBtn} ${provider === 'groq' ? styles.groqActive : ''}`}
              onClick={() => handleProviderSwitch('groq')}
            >⚡ Groq</button>
            <button
              className={`${styles.providerBtn} ${provider === 'ollama' ? styles.ollamaActive : ''}`}
              onClick={() => handleProviderSwitch('ollama')}
            >🦙 Ollama</button>
          </div>
          <select
            className={styles.modelSelect}
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button className={styles.clearBtn} onClick={clearChat}>clear</button>
        </div>
      </header>

      {provider === 'ollama' && (
        <div className={styles.apiBar}>
          <span className={styles.apiLabel}>OLLAMA_URL</span>
          <input
            className={styles.apiInput}
            value={ollamaUrl}
            onChange={e => setOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
          <span className={styles.apiNote}>make sure ollama serve is running</span>
        </div>
      )}

      <main className={styles.messages}>
        {messages.length === 0 && !streamingContent && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>⬡</div>
            <h1>localchat</h1>
            <p>Connected to {provider === 'groq' ? 'Groq cloud' : 'Ollama local'} · {modelLabel}</p>
            <div className={styles.chips}>
              {['Write a Python script', 'Explain async/await', 'Debug this error', 'Review my code'].map(c => (
                <button key={c} className={styles.chip} onClick={() => sendMessage(c)}>{c}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`${styles.msg} ${styles[msg.role]}`}>
            <div className={styles.avatar}>{msg.role === 'user' ? 'you' : 'ai'}</div>
            <div className={styles.msgBody}>
              <div className={styles.msgMeta}>
                <span>{msg.role === 'user' ? 'you' : 'assistant'}</span>
                {msg.role === 'assistant' && msg.provider && (
                  <span className={`${styles.badge} ${styles[msg.provider]}`}>
                    {msg.provider} · {msg.model?.split('/').pop()?.split(':')[0]}
                  </span>
                )}
                <span className={styles.time}>{formatTime(msg.timestamp)}</span>
              </div>
              <div
                className={styles.msgContent}
                dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
              />
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className={`${styles.msg} ${styles.assistant}`}>
            <div className={styles.avatar}>ai</div>
            <div className={styles.msgBody}>
              <div className={styles.msgMeta}>
                <span>assistant</span>
                <span className={`${styles.badge} ${styles[provider]}`}>{provider} · streaming</span>
              </div>
              <div
                className={styles.msgContent}
                dangerouslySetInnerHTML={{ __html: renderContent(streamingContent) + '<span class="cursor">▋</span>' }}
              />
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className={`${styles.msg} ${styles.assistant}`}>
            <div className={styles.avatar}>ai</div>
            <div className={styles.msgBody}>
              <div className={styles.msgMeta}><span>assistant</span></div>
              <div className={styles.msgContent}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorToast}>
            ⚠ {error}
            <button onClick={clearError}>×</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className={styles.inputArea}>
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKey}
            placeholder={`Message ${modelLabel}...`}
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <button className={`${styles.sendBtn} ${styles.stopBtn}`} onClick={stopGeneration}>■</button>
          ) : (
            <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={!input.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.statusBar}>
          <span className={styles.statusText}>
            {isLoading ? `streaming from ${provider}...` : 'ready'}
          </span>
          {tokenCount > 0 && (
            <span className={styles.tokenCount}>~{tokenCount} tokens</span>
          )}
        </div>
      </footer>
    </div>
  )
}
