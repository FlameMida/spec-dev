# spec-dev

English | [简体中文](README.zh-CN.md)

A design→plan→execute skill pipeline plugin: polish ideas into specs, break them into executable plans, and deliver with TDD discipline in isolated workspaces.

Design→Plan→Execute pipeline | Adversarial validation | Visual preview | All-round acceptance | MCP enhancements

## Features

- **Exploration mode** — `exploring`, a thinking partner: no-commitment exploration while an idea is unsettled — read-only, no code (HARD-GATE), opens side threads instead of interrogating, ASCII visualization, opt-in exploration notes under `docs/explorations/`; hands off to requirement-analysis once the idea crystallizes, and executing-plans can drop back into it when stuck
- **Requirement design** — `requirement-analysis`, an 8-phase design workflow: triage (light / standard / deep tiers), parallel internal+external exploration (no subagent cap), one-question-at-a-time clarification, sequential-thinking adversarial validation + 2-3 option comparison, spec writing with double review (structured behavior requirements: Requirement + Scenario); a HARD-GATE guarantees zero implementation before the design is approved
- **Visual preview** — `visual-preview`, a browser companion: JIT-proposed during design conversations, renders mockups, wireframes and layout comparisons, and collects click-through choices
- **Implementation plans** — `writing-plans` decomposes specs into bite-sized tasks executable with zero context: exact file paths, complete code, embedded 5-step TDD, consume/produce interface contracts, no placeholders allowed
- **Plan execution** — `executing-plans`: the main thread executes task-by-task (per-task commit + spec self-check), then wrap-up multi-dimension adversarial review (fan-out code-reviewer + contract validation + loop-until-dry + completeness critic), merge and summary
- **Engineering discipline** — `using-git-worktrees` (isolated workspaces, native tools first) and `test-driven-development` (no production code without a failing test) are standalone skills reusable from any workflow
- **All-round acceptance** — `acceptance-qa` runs acceptance over the dimension × execution-nature matrix: unit/integration/API, Playwright E2E, visual regression, accessibility, performance (web CWV / k6 for APIs / client), AI autonomous acceptance (mandatory evidence + serial recheck + verify-assertions-first) and failure diagnosis
- **Contract-driven orchestration** — subagent output goes through JSON Schema contracts, deterministically validated by `validate-output.mjs`, with one retry on failure
- **MCP enhancements** — integrates context7, sequential-thinking, playwright, chrome-devtools (optional, graceful degradation)
- **3 specialized agents** — code-explorer, external-resource-explorer, code-reviewer (analysis and verification re-runs only; implementation code is always written by the main thread)

## Skill Pipeline

```
exploring (unsettled idea → optional docs/explorations/<topic>.md)
        ↓ crystallizes
requirement-analysis (design → docs/YYYY-MM-DD-<feature>/spec/<feature>-design.md)
        ↕ JIT
  visual-preview
        ↓
writing-plans (plan → plan/<feature>-plan.md in the same feature dir)
        ↓
executing-plans (isolated execution + review + summary)
   ├── using-git-worktrees (isolated workspace)
   ├── test-driven-development (TDD discipline)
   └── acceptance-qa (matrix-driven acceptance)

quick-fix (already-decided small fix, no design space → root cause + spec back-lookup + contract split)
```

Each skill also works standalone: start from exploring while the idea is unsettled; enter at writing-plans with an existing spec; go straight to executing-plans with an existing plan; acceptance-qa / using-git-worktrees / test-driven-development can be triggered from any workflow; quick-fix handles small already-decided fixes without the full design workflow.

## Installation

### Claude Code

```bash
# Add as a marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev

# Install the plugin
/plugin install spec-dev@spec-agent-skills
```

### Codex

The repository ships a Codex plugin manifest: `.codex-plugin/plugin.json`. It exposes:

- `skills/`: `exploring`, `requirement-analysis`, `visual-preview`, `writing-plans`, `executing-plans`, `using-git-worktrees`, `test-driven-development`, `acceptance-qa`, `quick-fix`
- `.mcp.json`: optional MCP config for context7, sequential-thinking, playwright, chrome-devtools (activated via the manifest's `mcpServers` field; Codex does **not** read the project root `.mcp.json` directly — manual MCP setup outside the plugin goes into the `[mcp_servers]` table of `~/.codex/config.toml` or via `codex mcp add`)
- Plugin UI metadata: display name, category, capabilities, default prompts

The repository also ships a Codex marketplace manifest: `.agents/plugins/marketplace.json`. Add this repository directly as a marketplace:

```bash
codex plugin marketplace add https://github.com/FlameMida/spec-dev
```

The repository uses a flat layout: the repo root is the plugin root, and both the Claude Code and Codex marketplace manifests point to `./`. The Codex manifest writes the plugin source as `{"source": "url", "url": "./"}` (a `source.path` of `./` gets normalized to an empty path by Codex and filtered out of `/plugin`; the `url` form has no such issue).

If an older marketplace version was added locally, run `codex plugin marketplace upgrade spec-agent-skills` after a new release; for local development verification, remove the old source first, then add the current repository path.

The marketplace manifest's top-level `name` is `spec-agent-skills` (the marketplace identifier, used by `upgrade` and `plugin@marketplace` references), while the plugin entry `name` is `spec-dev` (the plugin identifier, used by `codex plugin add spec-dev@spec-agent-skills`):

```json
{
  "name": "spec-agent-skills",
  "interface": {
    "displayName": "Spec Dev"
  },
  "plugins": [
    {
      "name": "spec-dev",
      "source": {
        "source": "url",
        "url": "./"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Developer Tools"
    }
  ]
}
```

## Plugin Package Maintenance

The repo root is the plugin root (flat layout): `skills/`, `agents/`, `commands/`, `scripts/`, `.claude-plugin/plugin.json` (Claude Code manifest) and `.codex-plugin/plugin.json` (Codex manifest) are edited in place at the repo root; `README.md`, `CHANGELOG.md` and `.mcp.json` exist as single copies with no mirror syncing. A release must bump the version in three places (`metadata.version` in `.claude-plugin/marketplace.json` plus `version` in both `plugin.json` files), and `check-plugin.mjs` verifies they stay in sync:

```bash
node scripts/check-plugin.mjs
```

Validate the real install path with the official Codex CLI:

```bash
node scripts/check-plugin.mjs --codex-validate
```

`--codex-validate` creates a temporary `CODEX_HOME`, runs `codex plugin marketplace add <repo-root>` and `codex plugin add spec-dev@spec-agent-skills`, and does not touch the current user's Codex config or plugin cache.

Validate the bundled skills with `skill-creator`'s `quick_validate.py`:

```bash
node scripts/validate-skills.mjs
```

The script looks for the Codex built-in `skill-creator` first, and also supports `SKILL_CREATOR_QUICK_VALIDATE` or `SKILL_CREATOR_HOME` to point at a validator path. If the current Python lacks `PyYAML`, the script installs it into a temporary venv before validating.

### About evals

`skills/*/evals/` holds two kinds of files with different roles:

- `evals.json` — **design-intent documents**: they record the expected key behaviors of each skill (HARD-GATE refusals, handoff gates, degradation paths, etc.) for human review and a future evaluation harness. There is no runner in the repo, and most cases carry conversational preconditions with prose assertions — they are **not** an automated regression line; treat them as a checklist to walk through manually when changing skill behavior
- `trigger-evals.json` — **cold-startable, decidable trigger-surface cases** (should-trigger / should-not-trigger single-shot prompts + near-miss negatives): currently covering the three skills with the trickiest trigger boundaries — acceptance-qa, requirement-analysis, exploring; plug into any evaluation harness and run the verdicts directly

### Pre-commit hooks

Enable the versioned Git hooks:

```bash
node scripts/install-git-hooks.mjs
```

This sets `core.hooksPath=.githooks` for the repository. Once enabled, every commit runs:

```bash
node scripts/check-plugin.mjs --codex-validate
node scripts/validate-skills.mjs
node scripts/check-openai-sync.mjs
git diff --cached --check
```

The hook aborts the commit on validation failure; fix per the error and commit again. Set `SKIP_CODEX_PACKAGE_HOOK=1` to skip the hook temporarily; set `SKIP_OPENAI_SYNC_CHECK=1` when a SKILL change is confirmed not to need openai.yaml syncing.

## Using exploring

```bash
/exploring I'm wondering whether to build real-time collaboration — help me think it through
```

Thinking-partner posture: read-only code walks, side-by-side option threads, ASCII diagrams; no code, no files, no forced conclusions ("not worth building" is a valid outcome). When conclusions are worth keeping it offers to save `docs/explorations/<topic>.md`; once the idea crystallizes it hands off to requirement-analysis (the exploration notes feed its phase 1).

## Using requirement-analysis

```bash
/requirement-analysis design the user permission system
```

The 8-phase design workflow: understanding & triage → parallel exploration (internal + external in one wave) → clarification (one question at a time, JIT visual preview) → adversarial validation + 2-3 options → full design presentation → write & commit the spec → self-review + adversarial validation → hand off to writing-plans.

Phase 1 picks an execution tier and declares it to the user (overridable):

- **light** — single-file/single-module small changes: main-thread lookups, options may collapse to one, a few-sentence spec — but the design must still be presented and approved (the HARD-GATE is never waived)
- **standard** — the default: 3-5 code-explorers in parallel by layer/module + external-resource-explorer research + full option comparison
- **deep** — cross-layer architecture changes / new tech stacks: multi-modal blind sweep (no cap on modality count) + contract JSON validation on merge

The spec lands in the feature directory `docs/YYYY-MM-DD-<feature>/spec/<feature>-design.md` and is committed (the later plan lands in `plan/<feature>-plan.md` of the same directory), then goes through an adversarial review subagent and user review before handing off to writing-plans. Behavior requirements use the **Requirement + Scenario** (GIVEN/WHEN/THEN) structure, and test & acceptance strategy uses the **acceptance matrix** — Scenarios translate directly into TDD failing tests by writing-plans, and the matrix anchors wrap-up review and acceptance-qa; changes to existing behavior use the ADDED/MODIFIED/REMOVED delta sections.

## Using writing-plans / executing-plans

```bash
/writing-plans write an implementation plan from docs/2026-07-04-auth/spec/auth-design.md
/executing-plans execute docs/2026-07-04-auth/plan/auth-plan.md
```

- **writing-plans**: assumes a zero-context executor — every plan starts with a fixed Task 0 (set up an isolated workspace, with already-isolated detection and git fallback commands) and ends with a final task (merge & cleanup); when the spec's acceptance matrix has "acceptance task" rows, an acceptance task is generated between them. The worktree lifecycle closes within the plan, so it executes in order even outside this plugin. The header carries deviation-handling guidance; every task gets exact file paths, complete code, the 5 TDD steps (failing test → confirm fail → minimal implementation → confirm pass → commit) and consume/produce interface blocks; a three-way self-review (spec coverage / placeholders / type consistency) runs before handoff
- **executing-plans**: after execution confirmation, starts from Task 0 (isolated workspace, discipline per using-git-worktrees) and executes tasks continuously on the main thread (per-task commit `feat(TN): xxx` + spec self-check); when all tasks complete it fans out code-reviewer for multi-dimension adversarial review (review-findings contract validation + adversarial recheck of high/medium findings + completeness critic), triggers acceptance-qa per the acceptance matrix, consults the user on finding disposition, then runs the final task (merge & cleanup) and summarizes

## Using visual-preview

When a genuinely visual question comes up in a design conversation (layout comparison, mockups, architecture diagrams), requirement-analysis proposes it JIT; it can also be triggered manually:

```bash
/visual-preview show me two dashboard layout options side by side in the browser
```

A local server renders HTML fragments in the browser; user clicks flow back into the session; session files persist under `<project>/.spec-dev/visual/`.

## Using acceptance-qa

```bash
/acceptance-qa all run full acceptance on the export feature per the spec
/acceptance-qa e2e add E2E tests for the cart flow
/acceptance-qa perf-api load-test the order endpoint, p95 under 300ms
/acceptance-qa visual run visual regression for this styling change
/acceptance-qa diagnose the page stops responding after the button click
/acceptance-qa accept the cart page          # without a prefix, dimensions route by intent
```

Runs over the dimension × execution-nature matrix:

- **Tier D deterministic acceptance**: unit/integration/API, Playwright E2E (runs only files generated/involved this round), `toHaveScreenshot` visual regression, axe accessibility scans, performance thresholds (web CWV lab data, k6 thresholds for APIs) — real commands, zero LLM judgment
- **Tier A AI autonomous acceptance**: Playwright MCP driven, `browser_verify_*` assertions first, mandatory evidence citation per verdict, serial adversarial recheck of fail/warn + independent evidence audit of pass
- **Tier X diagnosis**: performance trace insights, heap snapshot comparison, network waterfall, root-cause hypothesis verification

Pipeline integration: the spec's acceptance matrix → writing-plans generates the acceptance task → executing-plans triggers this skill at wrap-up → reports and evidence land in the feature directory `acceptance/`.

## Using quick-fix

For a bug or small adjustment you've already decided to make and that has no design space, invoke quick-fix instead of the full requirement-analysis workflow:

> Use quick-fix to fix this small bug end-to-end.

It locates the root cause (with a spec back-lookup aligned to the drift guard's `covers`), confirms root cause / fix / contract impact one question at a time, fixes under TDD, and splits on contract impact — syncing the owning spec when behavior changes, or committing with a `Spec-Guard: off` trailer when it does not — then optionally runs acceptance-qa. If the root cause turns out to cross a behavior contract across specs, span multiple modules, or need a new dependency, quick-fix stops and offers to escalate to requirement-analysis.

## MCP Enhancements (recommended, optional)

Everything works without MCP; the plugin degrades gracefully to fallbacks.

| MCP tool | Main capability | Fallback |
|---------|---------|---------|
| **context7** | Up-to-date library docs and API references | WebSearch + project dependency analysis |
| **sequential-thinking** | Structured deep thinking | Explicit point-by-point reasoning in replies |
| **playwright** | Browser automation acceptance (verify assertions plus trace/video evidence) | Native Playwright tests |
| **chrome-devtools** | Performance tracing (CWV/insights), heap snapshots, debugging | Playwright trace / console logs |

### Recommended configuration

Edit `~/.claude.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": { "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}" }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

Get an API key: [Context7](https://context7.com/)

Check MCP configuration status: `/check-mcp`

## Specialized Agents

The main thread does the work; subagents never write code — implementation code is always written by the main thread, and agents only take on analysis tasks like exploration, review and verification re-runs:

| Agent | Purpose | Where it's used |
|-------|------|---------|
| **code-explorer** | Deep codebase analysis | requirement-analysis phase 2 parallel exploration |
| **external-resource-explorer** | External resource research with citable evidence | requirement-analysis phase 2 external wave and follow-up exploration |
| **code-reviewer** | Code review (confidence + severity) | executing-plans wrap-up multi-dimension review |

## Directory Layout

```
spec-dev/                            # repo root is the plugin root (flat layout)
├── .claude-plugin/
│   ├── marketplace.json             # Claude Code marketplace config (points to ./)
│   └── plugin.json                  # Claude Code plugin manifest
├── .codex-plugin/
│   └── plugin.json                  # Codex plugin manifest
├── .agents/
│   └── plugins/
│       └── marketplace.json         # Codex marketplace config (points to ./)
├── .githooks/
│   ├── pre-commit                   # validates the plugin package and skills before commit
│   ├── post-commit                  # auto-release after commit (version bump + CHANGELOG + tag)
│   └── pre-push                     # release backstop (checks CHANGELOG entry, backfills version tag)
├── .mcp.json                        # MCP config (shared by development and plugin distribution)
├── agents/                          # 3 specialized agents (analysis and verification re-runs, no implementation code)
├── commands/                        # /check-mcp command
├── guardrail/                       # spec drift guard (installable into target repos)
├── skills/
│   ├── exploring/                   # exploration mode (thinking partner)
│   ├── requirement-analysis/        # 8-phase requirement design workflow
│   ├── visual-preview/              # browser visual preview
│   ├── writing-plans/               # implementation plan writing
│   ├── executing-plans/             # plan execution + wrap-up review
│   ├── using-git-worktrees/         # isolated workspace discipline
│   ├── test-driven-development/     # TDD discipline
│   ├── acceptance-qa/               # all-round acceptance workflow
│   └── quick-fix/                   # lightweight bug-fix workflow
├── scripts/
│   ├── check-plugin.mjs             # manifest version sync + symlink + Codex CLI install checks
│   ├── validate-output.mjs          # subagent output contract validator
│   ├── schemas/                     # 3 output contract schemas + usage notes
│   ├── validate-skills.mjs          # validates skills via skill-creator
│   ├── check-openai-sync.mjs        # openai.yaml structure & SKILL sync tripwire
│   ├── release.mjs                  # release script (manual release / post-commit auto-release)
│   └── install-git-hooks.mjs        # enables the versioned Git hooks
├── CHANGELOG.md
├── README.md
└── README.zh-CN.md
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) (Chinese) for the detailed version history.

## License

MIT License

## Author

FlameMida

## Contributing

Issues and pull requests are welcome!
