import { NextRequest } from 'next/server'

export type Provider = 'anthropic' | 'openai' | 'openrouter'

const SYSTEM_PROMPT = `You are PromptLint — an expert prompt evaluator for production-grade LLM applications.

You evaluate prompts against 7 dimensions on a 1–5 scale, provide actionable feedback, and generate an improved version.

## Evaluation Dimensions

### 1. Clarity & Specificity (1-5)
Is the prompt unambiguous? Could a "brilliant new employee with no context" follow it?
- Instructions are action-oriented ("do X" rather than "don't do Y")
- Desired output format and constraints are explicit
- Sequential steps use numbered lists or clear ordering
- 5: Crystal clear | 4: Minor ambiguities | 3: Requires inference | 2: Vague/contradictory | 1: Fundamentally unclear

### 2. Context & Motivation (1-5)
Does it explain *why*, not just *what*?
- Background info about the task's purpose or audience
- Motivation behind constraints
- 5: Rich context | 4: Good, 1-2 gaps | 3: Key "whys" missing | 2: Mostly bare instructions | 1: No context

### 3. Structure & Organization (1-5)
Does it use structural elements to prevent misinterpretation?
- XML tags to separate instructions, context, examples, data
- Clear section boundaries, consistent naming
- 5: Well-structured | 4: Good, minor fixes | 3: Some mixing | 2: Wall of text | 1: No structure

### 4. Examples & Few-Shot Quality (1-5 or N/A)
Are there effective demonstrations?
- 3-5 diverse examples covering typical + edge cases
- Balanced across categories, wrapped in tags
- Score N/A if examples aren't needed
- 5: 3+ diverse examples | 4: Good, missing edges | 3: 1-2 similar | 2: Poorly formatted | 1: None where needed

### 5. Output Contract (1-5)
Does it define what "done" looks like?
- Format, length, tone, required fields, fallback behavior
- 5: Complete spec | 4: Missing one element | 3: Partial | 2: Vague | 1: No spec

### 6. Technique Fitness (1-5)
Given the use case, is it using the right prompting techniques?
- Classification → structured output, balanced examples, labels
- Reasoning → chain-of-thought, step-by-step
- Agentic → ReAct, tool definitions, safety rails
- RAG → grounding, source attribution, context tagging
- Code generation → schema definitions, language spec

#### Source Fidelity Sub-Rubric (activate for RAG/multi-source use cases):
- Per-source-type fidelity (code=exact, Jira=field-exact, Slack=attributed, legal=verbatim)
- Context tagging (<source type="code">, etc.)
- Attribution and traceability
- Conflict resolution between sources
- Separation of LLM reasoning from source material

### 7. Robustness & Edge Cases (1-5)
Does it handle adversarial inputs, ambiguity, failure modes?
- Prompt injection defense, hallucination guardrails
- Uncertainty handling, safety rails for destructive actions
- 5: Comprehensive | 4: Good, one gap | 3: Significant gaps | 2: Minimal | 1: None

## Output Format

You MUST respond with valid JSON matching this exact structure:

{
  "overallScore": <number 1-5, one decimal>,
  "topStrength": "<dimension name and short reason>",
  "priorityFix": "<dimension name and short reason>",
  "dimensions": [
    {
      "name": "Clarity & Specificity",
      "score": <1-5>,
      "summary": "<one-line justification>",
      "feedback": "<detailed feedback if score <= 3, otherwise null>"
    },
    // ... all 7 dimensions
  ],
  "techniquesRecommended": "<2-3 recommended techniques for this use case and why>",
  "changesSummary": [
    { "change": "<what was changed>", "dimension": "<which dimension>", "beforeAfter": "<brief before/after>" }
  ],
  "improvedPrompt": "<the full improved prompt, clean and production-ready, NO inline annotations>"
}

## Rules
- Be honest. A 5 means genuinely excellent. Most prompts score 2-4.
- The improved prompt must be CLEAN and production-ready — no <!-- comments -->, no [CHANGED] markers. All change explanations go in changesSummary.
- If Examples dimension is N/A, set score to null and summary to "N/A — examples not needed for this use case".
- For the overall score, compute weighted average excluding N/A dimensions.
- Respond ONLY with the JSON object. No markdown code fences, no preamble.`

const PROVIDER_CONFIG: Record<Provider, {
  url: string
  model: string
  buildHeaders: (apiKey: string) => Record<string, string>
  buildBody: (model: string, systemPrompt: string, userMessage: string) => Record<string, unknown>
  extractContent: (data: Record<string, unknown>) => string | null
  errorMessages: Record<number, string>
}> = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (model, systemPrompt, userMessage) => ({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
    extractContent: (data) => {
      const content = data?.content as Array<{ text?: string }> | undefined
      return content?.[0]?.text ?? null
    },
    errorMessages: {
      401: 'Invalid API key. Check your Anthropic API key and try again.',
      429: 'Rate limited. Wait a moment and try again.',
      529: 'Anthropic API is overloaded. Try again in a few seconds.',
    },
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (model, systemPrompt, userMessage) => ({
      model,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    extractContent: (data) => {
      const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined
      return choices?.[0]?.message?.content ?? null
    },
    errorMessages: {
      401: 'Invalid API key. Check your OpenAI API key and try again.',
      429: 'Rate limited. Wait a moment and try again.',
      503: 'OpenAI API is temporarily unavailable. Try again in a few seconds.',
    },
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-sonnet-4',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (model, systemPrompt, userMessage) => ({
      model,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    extractContent: (data) => {
      const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined
      return choices?.[0]?.message?.content ?? null
    },
    errorMessages: {
      401: 'Invalid API key. Check your OpenRouter API key and try again.',
      429: 'Rate limited. Wait a moment and try again.',
      502: 'Upstream model error. Try again or pick a different model.',
    },
  },
}

function isValidProvider(value: string): value is Provider {
  return value === 'anthropic' || value === 'openai' || value === 'openrouter'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, useCase, apiKey, provider: rawProvider } = body

    if (!prompt || !useCase || !apiKey) {
      return Response.json(
        { error: 'Missing required fields: prompt, useCase, apiKey' },
        { status: 400 }
      )
    }

    const provider: Provider = isValidProvider(rawProvider) ? rawProvider : 'anthropic'
    const config = PROVIDER_CONFIG[provider]

    const userMessage = `Evaluate this prompt for the following use case.\n\n**Use case:** ${useCase}\n\n**Prompt to evaluate:**\n\n${prompt}`

    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.buildHeaders(apiKey),
      body: JSON.stringify(config.buildBody(config.model, SYSTEM_PROMPT, userMessage)),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const message =
        config.errorMessages[response.status] ??
        (errorData as Record<string, unknown>)?.error?.toString() ??
        `API error (${response.status})`
      return Response.json({ error: message }, { status: response.status })
    }

    const data = await response.json()
    const content = config.extractContent(data)

    if (!content) {
      return Response.json(
        { error: 'Empty response from the model.' },
        { status: 502 }
      )
    }

    // Parse the JSON response - handle potential markdown fences
    let parsed
    try {
      const cleaned = content
        .replace(/^```json\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return Response.json(
        { error: 'Failed to parse evaluation response. Please try again.', raw: content },
        { status: 502 }
      )
    }

    return Response.json(parsed)
  } catch (error) {
    console.error('Lint API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
