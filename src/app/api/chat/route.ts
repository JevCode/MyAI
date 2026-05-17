import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 60

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
  model: string
  provider: 'groq' | 'ollama'
  ollamaUrl?: string
}

async function callGroq(messages: ChatMessage[], model: string): Promise<ReadableStream> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured on server')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message || `Groq API error ${res.status}`)
  }

  return res.body!
}

async function callOllama(messages: ChatMessage[], model: string, baseUrl: string): Promise<ReadableStream> {
  const url = `${baseUrl}/api/chat`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}. Is Ollama running at ${baseUrl}?`)
  }

  // Ollama streams NDJSON — convert to SSE format for unified client handling
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const lines = decoder.decode(value).split('\n').filter(Boolean)
          for (const line of lines) {
            try {
              const json = JSON.parse(line)
              const content = json.message?.content || ''
              if (content) {
                const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
                controller.enqueue(new TextEncoder().encode(sseData))
              }
              if (json.done) {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              }
            } catch {}
          }
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json()
    const { messages, model, provider, ollamaUrl } = body

    if (!messages || !model || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let stream: ReadableStream

    if (provider === 'groq') {
      stream = await callGroq(messages, model)
    } else {
      const baseUrl = ollamaUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      stream = await callOllama(messages, model, baseUrl)
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
