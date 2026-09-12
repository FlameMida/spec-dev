# spec-dev

English | [简体中文](README.zh-CN.md)

A design→plan→execute skill pipeline plugin: polish ideas into specs, break them into executable plans, and deliver with TDD discipline in isolated workspaces.

Design→Plan→Execute pipeline | Adversarial validation | Visual preview | All-round acceptance | MCP enhancements

## Features

- **Exploration mode** — `exploring` keeps unsettled ideas open: read-only by default, with explicitly authorized throwaway spikes for questions that require running code. Optional background research traces material claims to primary sources. Decision lists remain one question at a time; notes can retain rejected options and their conditions. Handoff is proposed once the delivery question is precise, even when its answer is unknown.
- **Requirement design** — `requirement-analysis`, an 8-phase design workflow: triage (light / standard / deep tiers), bounded internal/external exploration dispatched within actual capacity, one-question-at-a-time clarification, sequential-thinking adversarial validation + 2-3 option comparison, spec writing with double review (structured behavior requirements: Requirement + Scenario); a HARD-GATE guarantees zero implementation before the design is approved
- **Visual preview** — `visual-preview`, a browser companion: JIT-proposed during design conversations, renders mockups, wireframes and layout comparisons, and collects click-through choices
- **Implementation plans** — `writing-plans` decomposes specs into bite-sized tasks executable by an engineer who can read the repo: exact file paths, change notes with key diff snippets, embedded 5-step TDD, consume/produce interface contracts, no placeholders allowed
- **Plan execution** — `executing-plans`: the main thread executes task-by-task (per-task commit + spec self-check), then a wrap-up review sized 1/2/5 routes by diff (reads execution receipts instead of re-running tests; rebuttal and critic only when high/medium candidates exist), merge and summary
- **Optional parallel execution** — `executing-plans-parallel`: explicit selection, model declaration, task-boundary switching, exclusive progress, isolated implementation and interruption recovery; shared local/PR delivery.
- **Engineering discipline** — `using-git-worktrees` (isolated workspaces, native tools first) and `test-driven-development` (no production code without a failing test) are standalone skills reusable from any workflow
- **All-round acceptance** — `acceptance-qa` runs acceptance over the dimension × execution-nature matrix: unit/integration/API, Playwright E2E, visual regression, accessibility, performance (web CWV / k6 for APIs / client), AI autonomous acceptance (mandatory evidence + serial recheck + verify-assertions-first) and failure diagnosis
- **Lightweight fix** — `quick-fix`, for decided fixes with no design space: evidence-backed diagnosis, one-question-at-a-time confirmation and TDD through the approved public seam. It offers escalation for contract scope, modules, dependencies, conflicting current specs or insufficient diagnostic evidence; comparable intermittent failures may stay in quick-fix. Closure checks reproduction rates, temporary instrumentation, the original symptom and root-cause evidence; acceptance-qa remains optional.
- **Shared clarification** — `clarifying`, the grill-style questioning discipline (one question at a time down the decision tree, facts self-researched, each decision put to the user with a recommendation); referenced by requirement-analysis and quick-fix, and usable standalone with three exits (hand off to the main workflow / stop / write notes to md)
- **Contract-driven orchestration** — subagent output goes through JSON Schema contracts, deterministically validated by `validate-output.mjs`, with one retry on failure
- **Zero MCP dependency** — structured reasoning ships as a vendored skill (`sequential-thinking`); browser automation MCPs (playwright / chrome-devtools) are opt-in per project, see `skills/acceptance-qa/references/mcp-setup.md`
- **4 specialized agents** — code-explorer, external-resource-explorer and code-reviewer handle analysis and verification; implementer writes code in an isolated worktree only after explicit parallel selection.

## Skill Pipeline

```
exploring (unsettled idea → optional .spec-dev/explorations/<topic>.md)
        ↓ crystallizes
requirement-analysis (design → .spec-dev/YYYY-MM-DD-NN-<feature>/spec/<feature>-design.md)
        ↕ JIT
  visual-preview
        ↓
writing-plans (plan → plan/ split-file layout: index.md + tasks/ + progress.yaml)
        ↓
executing-plans (isolated execution + review + summary)
   ├── executing-plans-parallel (opt-in, disjoint writes, model declaration, resume)
   ├── using-git-worktrees (isolated workspace)
   ├── test-driven-development (TDD discipline)
   └── acceptance-qa (matrix-driven acceptance)

quick-fix (already-decided small fix, no design space)  ── bypass fast path
   root cause + spec back-lookup → one-question confirm → TDD fix → optional acceptance
        ↑ offers escalation on scope / current-contract conflict / insufficient-evidence signals

roadmap continuation (oversized goals)  ── decomposition registered at .spec-dev/roadmaps/<project>.md ── outer loop
   requirement-analysis registers sub-projects → each runs the full pipeline independently → executing-plans marks delivery and offers the next one
```

The three entry points split by commitment and design space: **exploring** (undecided — should we even do this?), **quick-fix** (decided, no design space — a small bug or adjustment), **requirement-analysis** (decided, has design space — a feature or change). quick-fix reuses test-driven-development and acceptance-qa, and hands control back to requirement-analysis the moment a fix turns out to need real design.

All artifacts (specs, plans, acceptance reports, exploration notes, ADRs, roadmaps) live under `.spec-dev/` at the project root; legacy artifacts under `docs/` are auto-migrated there by default (the guard installer ships `migrate-to-spec-dev.mjs`, and the session self-check migrates on sight of a legacy layout), while the drift guard keeps recognizing the old location until migration lands.

Each skill also works standalone: start from exploring while the idea is unsettled; enter at writing-plans with an existing spec; go straight to executing-plans with an existing plan; acceptance-qa / using-git-worktrees / test-driven-development can be triggered from any workflow; quick-fix handles small already-decided fixes without the full design workflow; clarifying grills an idea into shared understanding without committing to any workflow.

## Installation

### Claude Code

```bash
# Add as a marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev

# Install the plugin
/plugin install spec-dev@spec-agent-skills
```

### Codex

```bash
# Add as a marketplace
codex plugin marketplace add https://github.com/FlameMida/spec-dev

# Install the plugin
codex plugin add spec-dev@spec-agent-skills
```

The Codex manifests (`.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`) also expose plugin UI metadata. After a new release, run `codex plugin marketplace upgrade spec-agent-skills`.

### Platform matrix

| Platform | Skills | Agents (subagents) | Hooks | Manifest |
|---|---|---|---|---|
| Claude Code | ✅ marketplace `skills[]` | ✅ `agents/*.md` | ✅ guardrail install | `.claude-plugin/` |
| Codex | ✅ directory auto-discovery | ⚠️ via dispatch prompts (`spawn_agent` does not read `agents/*.md`) | ✅ codex-hooks | `.codex-plugin/` |
| Grok Build | ✅ zero-config Claude-compat (official claim) | ✅ same as Claude Code (field behavior: see acceptance walkthrough) | ✅ same as Claude Code | reuses `.claude-plugin/` |
| Pi (pi.dev) | ✅ `package.json` `pi.skills` | ⚠️ requires the `pi-subagents` extension | ❌ needs a TS extension (not adapted) | `package.json` |
| Agent plugins 1.0.0 | ✅ root `plugin.json` + `skills/` | — (outside the portable standard) | — (same) | `plugin.json` |

Plugin-level `hooks/hooks.json` auto-registers the SessionStart context injection on platforms that honor plugin hooks (Claude Code / Grok Build) — no manual install needed for injection. `guardrail/install.mjs` remains the way to get the git gate (pre-commit / pre-push / CI) and the PreToolUse / Stop drift guards.

### Runtime dependencies

| Tier | Dependency | Used by | When missing |
|---|---|---|---|
| hard | `git` | drift guard, worktrees, per-task commits, `sync_commit` anchoring | main workflows unavailable |
| hard | Node.js ≥ 18 | `validate-output.mjs`, guardrail scripts, `doctor.mjs`, `think.mjs`, the visual-preview server, `node --test` | contract validation, guard, doctor and visual preview unavailable |
| soft | `bun` / `tsx` | sequential-thinking `think.ts` | falls back to `think.mjs` (Node), then to point-by-point reasoning in replies |
| soft | `python3` | anysearch CLI (`anysearch_cli.py`) | falls back to the zero-dependency Node CLI (`anysearch_cli.js`), then to WebSearch / WebFetch |
| soft | Playwright / k6 / Lighthouse / browser MCPs | acceptance-qa Tier A and performance rows | Tier D toolchain, or the row is marked `unverified` |
| soft | `codex` CLI, `skill-creator` | repository development only (pre-commit checks) | skipped softly |

If the contract validator cannot run (Node missing, or the plugin root cannot be resolved), the main thread checks the required keys and `coverage_note` against the schema by hand and notes "contract validation degraded" in the report — the single definition point is `skills/requirement-analysis/references/exploration-patterns.md` (Output contracts & validation; plugin-root resolution).

Controlled reviews on macOS/Linux additionally require Python 3.9+, an authenticated local Claude CLI, and rtk. Native workflows remain available on other platforms, without claiming the same programmatic guarantees. See `skills/executing-plans/references/review-orchestration.md`.

## Plugin Package Maintenance

The repo root is the plugin root (flat layout): `skills/`, `agents/`, `commands/`, `scripts/`, `.claude-plugin/plugin.json` (Claude Code manifest), `.codex-plugin/plugin.json` (Codex manifest), root `plugin.json` (Agent Plugins 1.0.0) and `package.json` (pi distribution) are edited in place at the repo root; `README.md` and `CHANGELOG.md` exist as single copies with no mirror syncing. A release must bump the version in five places (`metadata.version` in `.claude-plugin/marketplace.json`, `version` in both `.claude-plugin/` and `.codex-plugin/` `plugin.json` files, root `plugin.json`, and `package.json`), and `check-plugin.mjs` verifies they stay in sync:

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
- `trigger-evals.json` — **cold-startable, decidable trigger-surface cases** (should-trigger / should-not-trigger single-shot prompts + near-miss negatives): currently covering seven skills — `acceptance-qa`, `clarifying`, `exploring`, `quick-fix`, `requirement-analysis`, `test-strategy`, `executing-plans-parallel`; plug into any evaluation harness and run the verdicts directly

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

### Maturity tiers and release discipline

Skill discovery has four paths and all of them point at `skills/` only: Claude Code reads the explicit `skills[]` list in `.claude-plugin/marketplace.json` (`check-plugin.mjs` verifies it two-way against the directories on disk — a skill directory missing from the list, or a listed directory that does not exist, fails pre-commit); Codex auto-discovers `skills/`; Pi reads `pi.skills` in `package.json`; Agent Plugins 1.0.0 reads the root `plugin.json` plus `skills/`.

- **Experimental skills** live under a top-level `skills-in-progress/<name>/` directory: nothing there enters any plugin manifest, no stability is promised, and users install one by pointing their tool at the path.
- **Graduation checklist**: move the directory into `skills/` → add it to `skills[]` in `.claude-plugin/marketplace.json` → add `agents/openai.yaml` → add `evals/evals.json` (plus `trigger-evals.json` when the trigger boundary is tricky) → mention it in the README three times (Features, Skill Pipeline, Directory Layout) → CHANGELOG entry.
- **Thin-shell convention**: orchestration skills only describe flow; discipline is referenced ("follow skill X; X is the definition"), never restated. Shared definition points: the clarifying core discipline, `writing-plans/references/design-principles.md`, `requirement-analysis/references/exploration-patterns.md` (dispatch, failure isolation, plugin-root resolution, contract validation), `requirement-analysis/references/codex-compat.md`, the writing-plans resource ledger (`progress.yaml` `resources`), `acceptance-qa/references/acceptance-matrix.md`, and the test-strategy lanes.

## Using exploring

```bash
/exploring I'm wondering whether to build real-time collaboration — help me think it through
```

Thinking-partner posture: read code, compare directions and keep discussion open. A narrowly authorized spike may answer a question that requires execution; retain observations and an explicit resource disposition. Notes remain opt-in. Relevant implementations, prior rejections and shared terms in `.spec-dev/glossary.md` are reused without automatic decisions; shared terms are saved with approved specs.

## Using requirement-analysis

```bash
/requirement-analysis design the user permission system
```

The 8-phase design workflow: understanding & triage → parallel exploration (internal + external in one wave) → clarification (one question at a time, JIT visual preview) → adversarial validation + 2-3 options → full design presentation → write & commit the spec → self-review + adversarial validation → hand off to writing-plans.

Phase 1 picks an execution tier and declares it to the user (overridable):

- **light** — single-file/single-module small changes: main-thread lookups, options may collapse to one, a few-sentence spec — but the design must still be presented and approved (the HARD-GATE is never waived)
- **standard** — the default: 3-5 code-explorers in parallel by layer/module + external-resource-explorer research + full option comparison
- **deep** — cross-layer architecture changes / new tech stacks: multi-modal blind sweep (no cap on modality count) + contract JSON validation on merge

The spec lands in the feature directory `.spec-dev/YYYY-MM-DD-NN-<feature>/spec/<feature>-design.md` and is committed (the later plan lands in the same directory's `plan/` as index.md + tasks/ + progress.yaml), then goes through an adversarial review subagent and user review before handing off to writing-plans. Design also checks actual actors, constraint ownership and test precedents. Behavior requirements use the **Requirement + Scenario** (GIVEN/WHEN/THEN) structure, and test & acceptance strategy uses the **acceptance matrix** — writing-plans maps Scenarios to behavior TDD, refactor protection or group verification, and the matrix anchors wrap-up review and acceptance-qa; changes to existing behavior use the ADDED/MODIFIED/REMOVED delta sections.

## Using writing-plans / executing-plans

```bash
/writing-plans write an implementation plan from .spec-dev/2026-07-04-auth/spec/auth-design.md
/executing-plans execute .spec-dev/2026-07-04-auth/plan/index.md
```

- **writing-plans**: assumes an executor who can read the repo but not the design rationale — every plan starts with a fixed Task 0 (set up an isolated workspace, with already-isolated detection and git fallback commands) and ends with a final task (merge & cleanup); when the spec's acceptance matrix has "acceptance task" rows, an acceptance task is generated between them. The worktree lifecycle closes within the plan, so it executes in order even outside this plugin. The header carries deviation-handling guidance; every task gets exact file paths, key diff snippets, the applicable behavior TDD, refactor protection or integration-group verification steps and consume/produce interface blocks; a five-way self-review (spec coverage / placeholders / type consistency / navigation table ↔ task files / dependency minimality) runs before handoff
- **executing-plans**: after execution confirmation, starts from Task 0 (isolated workspace, discipline per using-git-worktrees) and executes tasks continuously on the main thread (per-task commit `feat(TN): xxx` + spec self-check); when all tasks complete it dispatches 1/2/5 code-reviewer routes by diff size (review-findings contract validation; reads execution/ receipts instead of re-running tests; adversarial recheck and completeness critic only when high/medium candidates exist), triggers acceptance-qa per the acceptance matrix, consults the user on finding disposition, then runs the final task (merge & cleanup) and summarizes

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

It follows one evidenced root-cause chain, obtains a real failure signal before confirming a non-obvious cause, and fixes through the approved public seam. Escalation remains a user decision; intermittent behavior alone is insufficient when reproduction conditions are comparable. Existing contract synchronization, TDD and authorization rules remain. Closure compares intermittent failure counts where relevant, accounts for temporary instrumentation, replays the original symptom, and explains the supported cause and verification limits. Independent side issues are recorded for follow-up; acceptance-qa remains optional.

## No External MCP Service Required

The plugin needs no external MCP service. The controlled review entry point generates a local stdio MCP configuration for restricted tools without registering a global server. Structured deep thinking is provided by the vendored `sequential-thinking` skill (falls back to explicit point-by-point reasoning in replies when no runtime is available). Browser automation for Tier A acceptance (playwright / chrome-devtools MCPs) is opt-in per project — see `skills/acceptance-qa/references/mcp-setup.md`; without them acceptance-qa degrades gracefully to the Tier D toolchain (native Playwright tests, traces, console logs).


Check plugin health across six domains (platform / guardrail / markers / injection replay / anysearch / reasoning runtime): `/doctor`

Triage a request to the right lane: `/triage <request>`

### Recorded project progress

Run `node "<absolute-plugin-directory>/scripts/status.mjs"` from any project subdirectory to read all registered worktrees of the same repository, or select a project with `--repo "/project/path"`. Use `--json` for the same snapshot as JSON and `--help` for usage.

The output includes roadmap records, spec lifecycles, plan completion/waiting/blocked records, and their sources. It preserves differing worktree records without selecting a winner. This does not re-run acceptance or verify delivery. Exit 0 means reading completed (blocked tasks and differences are allowed), 1 means partial/invalid input, and 2 means an invocation error. Current v1 template YAML/JSON, v2 JSON, and legacy plan checkboxes are supported; unsupported syntax is diagnosed without migration. The command is read-only, offline, and one-shot, separate from doctor and execution recovery.

Hosts supporting commands can use the status command instructions. Codex uses the plugin prompt entry or the same CLI above; it does not depend on commands being loaded. The script remains in the plugin directory and is not copied into the project.

## Specialized Agents

The main thread implements by default. With explicit executing-plans-parallel selection, implementer writes claimed files in its own worktree; the main thread owns progress and integration, while other agents retain analysis roles:

| Agent | Purpose | Where it's used |
|-------|------|---------|
| **code-explorer** | Deep codebase analysis | requirement-analysis phase 2 parallel exploration |
| **external-resource-explorer** | External resource research with citable evidence | requirement-analysis phase 2 external wave and follow-up exploration |
| **code-reviewer** | Code review, spec conformance and optional architecture deepening | Shared wrap-up review; coverage checking remains a separate critic |
| **implementer** | Single-task TDD and self-check | executing-plans-parallel isolated worktrees |

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
├── agents/                          # 4 agents, including opt-in implementer
├── commands/                        # /doctor, /triage commands
├── guardrail/                       # spec drift guard (installable into target repos)
├── skills/
│   ├── ddd-lifecycle/               # DDD lifecycle workflow
│   ├── exploring/                   # exploration mode (thinking partner)
│   ├── clarifying/                  # shared clarification discipline (grill-style)
│   ├── requirement-analysis/        # 8-phase requirement design workflow
│   ├── visual-preview/              # browser visual preview
│   ├── writing-plans/               # implementation plan writing
│   ├── executing-plans/             # plan execution + wrap-up review
│   ├── executing-plans-parallel/    # opt-in parallel execution and recovery
│   ├── using-git-worktrees/         # isolated workspace discipline
│   ├── test-driven-development/     # TDD discipline
│   ├── test-strategy/               # test strategy discipline (lanes / governance / acceptance-matrix link)
│   ├── acceptance-qa/               # all-round acceptance workflow
│   ├── quick-fix/                   # lightweight bug-fix workflow
│   ├── anysearch/                   # vendored real-time search CLI (upstream snapshot)
│   └── sequential-thinking/         # vendored structured reasoning (upstream snapshot + Node port)
├── scripts/
│   ├── check-plugin.mjs             # manifest version sync + symlink + Codex CLI install checks
│   ├── validate-output.mjs          # subagent output contract validator + plan-index structure check
│   ├── schemas/                     # 4 output contract schemas + 1 vendored manifest schema + usage notes
│   ├── validate-skills.mjs          # validates skills via skill-creator
│   ├── check-openai-sync.mjs        # openai.yaml structure & SKILL sync tripwire
│   ├── doctor.mjs                   # /doctor health checks (platform / guardrail / markers / injection / anysearch / reasoning runtime)
│   ├── update-vendored-skill.mjs    # syncs vendored skills from upstream (tag / SHA pinned)
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

## Instruction loading and shared document conventions

Skill entry files retain purpose, trigger boundaries and persistent constraints; detailed workflows, declarations, templates and recovery protocols load before the applicable action.
The existing exploration-patterns.md remains a valid navigation entry. Plugin-root resolution, dispatch/recovery and output contracts each retain one complete authoritative definition.
The planning fields and resource ledger live in writing-plans/references/plan-format.md; generated plans still embed complete applicable code, commands and interfaces.
DDD uses .spec-dev/glossary.md, feature-local spec terms and .spec-dev/adr/ in both standalone and delegated use.
Write only after design or document-saving authorization; reuse same-scope decisions and do not migrate existing documents automatically.
AnySearch, sequential-thinking and their upstream update logic remain unchanged, including their existing invocation rules.
Structure, document contracts and actual model behavior are separate verification results; shorter text is not evidence of improved model behavior.
