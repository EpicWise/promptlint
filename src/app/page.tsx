'use client'

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Dimension {
  name: string
  score: number | null
  summary: string
  feedback: string | null
}

interface Change {
  change: string
  dimension: string
  beforeAfter: string
}

interface LintResult {
  overallScore: number
  topStrength: string
  priorityFix: string
  dimensions: Dimension[]
  techniquesRecommended: string
  changesSummary: Change[]
  improvedPrompt: string
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-[var(--text-muted)]">N/A</span>
  const color =
    score >= 4 ? 'var(--green)' : score >= 3 ? 'var(--yellow)' : 'var(--red)'
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg"
      style={{ background: `${color}18`, color }}
    >
      {score}
    </span>
  )
}

function OverallScore({ score }: { score: number }) {
  const color =
    score >= 4 ? 'var(--green)' : score >= 3 ? 'var(--yellow)' : 'var(--red)'
  const pct = (score / 5) * 100
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="32" fontWeight="700">
          {score.toFixed(1)}
        </text>
        <text x="70" y="88" textAnchor="middle" fill="var(--text-muted)" fontSize="14">
          / 5.0
        </text>
      </svg>
      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Overall Score
      </span>
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full loading-dot"
          style={{ background: 'var(--accent)' }}
        />
      ))}
    </div>
  )
}

const EXAMPLE_PROMPT = `You are a customer support chatbot. Answer questions about our product. Be helpful.`
const EXAMPLE_USECASE = `Customer support chatbot for a SaaS product`

type Provider = 'anthropic' | 'openai' | 'openrouter'

const PROVIDERS: { value: Provider; label: string; placeholder: string }[] = [
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { value: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...' },
]

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [useCase, setUseCase] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [keyVerified, setKeyVerified] = useState<boolean | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LintResult | null>(null)
  const [activeTab, setActiveTab] = useState<'report' | 'improved'>('report')
  const [copied, setCopied] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const handleVerify = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key.')
      return
    }
    setVerifying(true)
    setError(null)
    setKeyVerified(null)

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider }),
      })
      const data = await res.json()
      if (data.valid) {
        setKeyVerified(true)
      } else {
        setKeyVerified(false)
        setError(data.error || 'API key verification failed.')
      }
    } catch {
      setKeyVerified(false)
      setError('Network error. Could not verify key.')
    } finally {
      setVerifying(false)
    }
  }, [apiKey, provider])

  const handleLint = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('API key is required.')
      return
    }
    if (!prompt.trim() || !useCase.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, useCase, apiKey, provider }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setResult(data)
      setActiveTab('report')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [prompt, useCase, apiKey, provider])

  const handleCopy = useCallback(() => {
    if (!result?.improvedPrompt) return
    navigator.clipboard.writeText(result.improvedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const loadExample = useCallback(() => {
    setPrompt(EXAMPLE_PROMPT)
    setUseCase(EXAMPLE_USECASE)
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              PL
            </div>
            <h1 className="text-lg font-semibold tracking-tight">PromptLint</h1>
            <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/EpicWise/promptlint"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </a>
            <span className="text-xs text-[var(--text-muted)]">by EpicWise</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Your prompt is only as strong as its weakest dimension
          </h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Most prompts fail not because they&apos;re bad overall, but because they&apos;re
            blind in one area — missing context, no output contract, weak on edge cases.
            PromptLint scores your prompt across 7 critical dimensions so you can see
            exactly where it breaks before your users do.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 max-w-4xl mx-auto">
            {[
              { icon: '1', label: 'Clarity', desc: 'Is it unambiguous?' },
              { icon: '2', label: 'Context', desc: 'Does it explain why?' },
              { icon: '3', label: 'Structure', desc: 'Is it well-organized?' },
              { icon: '4', label: 'Examples', desc: 'Are demos effective?' },
              { icon: '5', label: 'Output', desc: 'Is "done" defined?' },
              { icon: '6', label: 'Technique', desc: 'Right approach?' },
              { icon: '7', label: 'Robustness', desc: 'Handles edge cases?' },
            ].map((d) => (
              <div
                key={d.label}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {d.icon}
                </span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{d.label}</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight text-center">{d.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="flex flex-col gap-4">
            {/* Provider & API Key */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Provider
              </label>
              <div className="flex gap-2 mb-3">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setProvider(p.value)
                      setKeyVerified(null)
                      setError(null)
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                    style={{
                      background: provider === p.value ? 'var(--accent)' : 'var(--bg-input)',
                      color: provider === p.value ? 'white' : 'var(--text-secondary)',
                      borderColor: provider === p.value ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  API Key
                </label>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setKeyVerified(null)
                  }}
                  placeholder={PROVIDERS.find((p) => p.value === provider)?.placeholder}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors font-mono"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying || !apiKey.trim()}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: keyVerified === true ? 'var(--green)' : 'var(--bg-card)',
                    color: keyVerified === true ? 'white' : 'var(--text-secondary)',
                    borderColor: keyVerified === true ? 'var(--green)' : keyVerified === false ? 'var(--red)' : 'var(--border)',
                  }}
                >
                  {verifying ? '...' : keyVerified === true ? 'Verified' : 'Verify'}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Your key is sent directly to the provider — never stored or logged.
              </p>
            </div>

            {/* Use Case */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Use Case
              </label>
              <input
                type="text"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="e.g. Customer support chatbot for a SaaS product"
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
            </div>

            {/* Prompt */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Prompt
                </label>
                <button
                  onClick={loadExample}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Load example
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste your LLM prompt here..."
                className="flex-1 min-h-[300px] w-full px-4 py-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors resize-y leading-relaxed"
              />
            </div>

            {/* Lint Button */}
            <button
              onClick={handleLint}
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'var(--bg-card)' : 'var(--accent)',
                color: 'white',
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--accent-hover)'
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--accent)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  Evaluating <LoadingDots />
                </span>
              ) : (
                'Lint Prompt'
              )}
            </button>

            {error && (
              <div className="px-4 py-3 rounded-lg border border-[var(--red)] bg-[#ef444410] text-sm text-[var(--red)]">
                {error}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="flex flex-col gap-4">
            {!result && !loading && (
              <div className="flex-1 rounded-lg border border-dashed border-[var(--border)] flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-xs">
                  <div className="text-4xl mb-3 opacity-30">&#123;&#125;</div>
                  <p className="text-[var(--text-muted)] text-sm mb-2">
                    Your scored evaluation will appear here
                  </p>
                  <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                    Each dimension gets a 1–5 score with actionable feedback,
                    plus a production-ready improved prompt you can copy straight
                    into your codebase.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                  <LoadingDots />
                  <p className="text-[var(--text-secondary)] text-sm mt-4">
                    Evaluating across 7 dimensions...
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">
                    This usually takes 15-30 seconds
                  </p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4">
                {/* Score Summary */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <div className="flex items-start gap-6">
                    <OverallScore score={result.overallScore} />
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <span className="text-xs font-medium text-[var(--green)]">Top Strength</span>
                          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{result.topStrength}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-[var(--red)]">Priority Fix</span>
                          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{result.priorityFix}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dimension Scores */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <h3 className="text-sm font-semibold mb-3">Dimension Scores</h3>
                  <div className="space-y-2">
                    {result.dimensions.map((d) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <ScoreBadge score={d.score} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)]">{d.name}</div>
                          <div className="text-xs text-[var(--text-muted)] truncate">{d.summary}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs: Report / Improved */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                  <div className="flex border-b border-[var(--border)]">
                    <button
                      onClick={() => setActiveTab('report')}
                      className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        color: activeTab === 'report' ? 'var(--accent)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'report' ? '2px solid var(--accent)' : '2px solid transparent',
                      }}
                    >
                      Detailed Feedback
                    </button>
                    <button
                      onClick={() => setActiveTab('improved')}
                      className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        color: activeTab === 'improved' ? 'var(--accent)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'improved' ? '2px solid var(--accent)' : '2px solid transparent',
                      }}
                    >
                      Improved Prompt
                    </button>
                  </div>

                  <div className="p-5 max-h-[500px] overflow-y-auto">
                    {activeTab === 'report' && (
                      <div>
                        {/* Detailed feedback for low-scoring dimensions */}
                        {result.dimensions
                          .filter((d) => d.feedback)
                          .map((d) => (
                            <div key={d.name} className="mb-5 last:mb-0">
                              <div className="flex items-center gap-2 mb-2">
                                <ScoreBadge score={d.score} />
                                <h4 className="text-sm font-semibold">{d.name}</h4>
                              </div>
                              <div className="markdown-report text-sm">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {d.feedback!}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ))}

                        {result.dimensions.filter((d) => d.feedback).length === 0 && (
                          <p className="text-sm text-[var(--text-secondary)]">
                            All dimensions scored well. Check the improved prompt for minor enhancements.
                          </p>
                        )}

                        {/* Techniques */}
                        {result.techniquesRecommended && (
                          <div className="mt-5 pt-5 border-t border-[var(--border)]">
                            <h4 className="text-sm font-semibold mb-2">Recommended Techniques</h4>
                            <div className="markdown-report text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {result.techniquesRecommended}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}

                        {/* Changes Summary */}
                        {result.changesSummary?.length > 0 && (
                          <div className="mt-5 pt-5 border-t border-[var(--border)]">
                            <h4 className="text-sm font-semibold mb-2">Changes Made</h4>
                            <div className="space-y-2">
                              {result.changesSummary.map((c, i) => (
                                <div
                                  key={i}
                                  className="text-xs p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]"
                                >
                                  <span className="font-medium text-[var(--text-primary)]">{c.change}</span>
                                  <span className="text-[var(--text-muted)]"> — {c.dimension}</span>
                                  <div className="text-[var(--text-muted)] mt-1">{c.beforeAfter}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'improved' && (
                      <div>
                        <div className="flex justify-end mb-3">
                          <button
                            onClick={handleCopy}
                            className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
                          >
                            {copied ? 'Copied!' : 'Copy to clipboard'}
                          </button>
                        </div>
                        <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words p-4 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] font-mono">
                          {result.improvedPrompt}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>PromptLint by EpicWise — MIT License</span>
          <div className="flex gap-4">
            <a
              href="https://github.com/EpicWise/promptlint"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors"
            >
              Source
            </a>
            <a
              href="https://github.com/EpicWise/promptlint/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors"
            >
              Contribute
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
