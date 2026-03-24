import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PromptLint — Lint your LLM prompts',
  description: 'Score your prompt across 7 dimensions, get actionable feedback, and generate an improved version. By EpicWise.',
  openGraph: {
    title: 'PromptLint — Lint your LLM prompts',
    description: 'Score your prompt across 7 dimensions, get actionable feedback, and generate an improved version.',
    url: 'https://promptlint.vercel.app',
    siteName: 'PromptLint',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PromptLint — Lint your LLM prompts',
    description: 'Score your prompt across 7 dimensions, get actionable feedback, and generate an improved version.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
