# PromptLint

A linter for LLM prompts. Scores your prompt across 7 dimensions, flags technique gaps for your use case, and generates an improved version.

PromptLint is a [Claude Code plugin](https://docs.claude.com) that evaluates prompts the way a code linter evaluates code — against a rubric of best practices, tuned to what actually matters for *your* use case.

## What it does

Run `/promptlint` on any LLM prompt and get:

1. **A scored evaluation** across 7 dimensions (1–5 scale each)
2. **Actionable feedback** with concrete fixes for every weak area
3. **An improved prompt** that's clean and production-ready — copy it straight into your codebase

### Evaluation Dimensions

| Dimension | What it checks |
|-----------|---------------|
| Clarity & Specificity | Can a "brilliant new employee with no context" follow it? |
| Context & Motivation | Does it explain *why*, not just *what*? |
| Structure & Organization | XML tags, section boundaries, hierarchy |
| Examples & Few-Shot | Diverse, realistic demos (or N/A when not needed) |
| Output Contract | Format, length, tone, edge case handling |
| Technique Fitness | Right prompting patterns for the use case |
| Robustness & Edge Cases | Injection defense, hallucination guardrails, failure modes |

### Use-case-aware evaluation

PromptLint doesn't give generic advice. It maps your use case to the right prompting techniques and checks whether your prompt uses them:

- **Classification** → structured output, balanced examples, label definitions
- **Agentic** → ReAct pattern, tool definitions, safety rails
- **RAG** → grounding, source attribution, context tagging
- **Code generation** → schema definitions, language/framework spec
- **Reasoning** → chain-of-thought, step-by-step decomposition

### Source Fidelity Sub-Rubric

For multi-source RAG systems (code intelligence, Jira + Slack + PDF pipelines, hybrid graph agents), PromptLint activates a specialized sub-rubric that checks:

- Per-source-type fidelity rules (code must be character-exact, Jira fields preserved, Slack attributed to speakers, legal docs quoted verbatim)
- Context tagging structure (`<source type="code">`, `<source type="jira">`, etc.)
- Attribution and traceability (file paths, ticket IDs, timestamps)
- Conflict resolution instructions (what happens when sources disagree)
- Separation of LLM reasoning from source material

## Installation

```bash
# Clone the repo
git clone https://github.com/EpicWise/promptlint.git

# Run Claude Code with the plugin loaded
claude --plugin-dir ./promptlint
```

## Usage

```
/promptlint ./prompts/system-prompt.md Customer support chatbot handling refunds

/promptlint ./src/rag-prompt.txt Hybrid code intelligence assistant with Jira and Slack context

/promptlint paste Classification pipeline for routing support tickets
```

**First argument:** file path to the prompt, or `paste` to paste it inline.

**Remaining arguments:** the use case — what the prompt does, who it's for, and any constraints the linter should know.

## Output

Every lint run produces two timestamped files:

```
system_prompt.md                              ← your original (untouched)
system_prompt_lint_20260323_143052.md          ← evaluation report
system_prompt_improved_20260323_143052.md      ← improved prompt
```

Run the linter again after making changes and the previous results are preserved — making it easy to diff across iterations and track how your prompt evolved.

## Scoring

Scoring is strict by design. A 5/5 means genuinely excellent. Most production prompts score 2–4 on most dimensions, and that's normal — the value is in the specific, actionable feedback.

## Project Structure

```
promptlint/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/
│   └── lint.md              # /promptlint slash command
├── skills/
│   └── evaluate-prompt/
│       ├── SKILL.md          # Core evaluation engine
│       └── references/
│           └── techniques.md # Technique-to-use-case mapping
├── evals/
│   ├── evals.json           # Test cases with expected outcomes
│   └── test-prompts/        # Sample prompts for testing
├── LICENSE                   # MIT
├── CONTRIBUTING.md
└── README.md
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for details. Areas where help is especially valuable:

- **New technique references** — know a prompting pattern that should be part of the evaluation? Add it.
- **New test cases** — prompts from healthcare, legal, finance, devtools, and other domains.
- **Use-case-specific sub-rubrics** — similar to the Source Fidelity Sub-Rubric, other domains may benefit from specialized checks.
- **Model-specific guidance** — deep experience with a model's prompting quirks? Add model-aware checks.

## Roadmap

- **v1.0** (current) — Prompt evaluation and improvement
- **v1.1** — Prompt generation from a use case description (`/promptlint generate`)

## License

[MIT](LICENSE) — Copyright 2026 EpicWise
