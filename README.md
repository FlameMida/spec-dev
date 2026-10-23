# spec-dev

English | [简体中文](README.zh-CN.md)

A design→plan→execute skill pipeline plugin: polish ideas into specs, break them into executable plans, and deliver with TDD discipline in isolated workspaces.

Design→Plan→Execute pipeline | Adversarial validation | Visual preview | All-round acceptance | MCP enhancements

## Features

- **Visual explanations** — `wtf` explains concepts, code and processes so a 10-year-old can follow, using terminal character diagrams and very little prose while preserving the real mechanism and essential caveats.
- **Exploration mode** — `exploring` keeps unsettled ideas open: read-only by default, with explicitly authorized throwaway spikes for questions that require running code. Optional background research traces material claims to primary sources. Decision lists remain one question at a time; notes can retain rejected options and their conditions. Handoff is proposed once the delivery question is precise, even when its answer is unknown.
- **Requirement design** — `requirement-analysis`, an 8-phase design workflow: triage (light / standard / deep tiers), bounded internal/external exploration dispatched within actual capacity, one-question-at-a-time clarification, adversarial validation + 2-3 option comparison, spec writing with double review (structured behavior requirements: Requirement + Scenario); a HARD-GATE guarantees zero implementation before the design is approved
- **Interactive prototypes** — new pages and substantial layout or interaction changes automatically open an HTML preview once goals are clear. Shared clarification resolves decisions; approved versions and assets flow into specs, plans and acceptance. Small changes may skip preview; explicit opt-outs persist.
- **Implementation plans** — `writing-plans` decomposes specs into independently verifiable tasks: exact file paths, change notes, concrete assertions and commands, embedded 5-step TDD, and consume/produce interface contracts; code snippets are included when needed
- **Plan execution** — main-thread implementation and commits, then independent final verification, 1/2/5 review routes, acceptance/reconciliation and delivery. Reuse verified originals; recheck gaps. High/medium candidates, large tier or explicit always trigger the critic.
- **Unified execution** — `executing-plans`: parallel task-graph scheduling by default with continuous refill, exclusive progress and integration, and shared recovery/review/delivery.
- **Engineering discipline** — `using-git-worktrees` (isolated workspaces, native tools first) and `test-driven-development` (valid red for behavior changes, green protection for refactors, and a single authorized exception policy) are standalone skills reusable from any workflow
- **Outcome acceptance** — pages use three steps: verify the approved prototype, running version and evidence; compare actual layout, interactions and states; fill gaps and report. Reuse valid engineering evidence; backend contracts and specialist checks retain their own scope.
- **Lightweight fix** — `quick-fix`, for decided fixes with no design space: evidence-backed diagnosis, one-question-at-a-time confirmation and TDD through the approved public seam. It offers escalation for contract scope, modules, dependencies, conflicting current specs or insufficient diagnostic evidence; comparable intermittent failures may stay in quick-fix. Closure checks reproduction rates, temporary instrumentation, the original symptom and root-cause evidence; original-symptom verification is required and specialist acceptance is invoked as needed.
- **Shared clarification** — exploring, requirement analysis, quick fixes and visual preview share general and UI clarification. Resolve one real decision at a time, preserve prior decisions and distinguish local choices from design approval. Standalone clarification retains its three exits.
- **Contract-driven orchestration** — subagent output goes through JSON Schema contracts, deterministically validated by `validate-output.mjs`, with one retry on failure
- **Zero MCP dependency** — browser automation MCPs (playwright / chrome-devtools) are opt-in per project, see `skills/acceptance-qa/references/mcp-setup.md`
- **4 specialized agents** — code-explorer, external-resource-explorer and code-reviewer handle analysis and verification; implementer writes claimed code in an isolated worktree once plan execution is authorized.

## Skill Pipeline

For an explanation on its own, invoke `wtf`: `$wtf Explain caching with terminal diagrams`. It explains the question directly without requiring a design or implementation workflow.

`wtf` ships with the plugin for Claude Code / Grok Build, Codex, Pi and generic Agent Plugins packages. Claude Code / Grok Build use the Claude marketplace skill list; Codex / Pi discover `skills/` through their manifests, and generic packages use the same directory under the standard layout. Git `dist`, ZIP, tar.gz and npm tgz distributions all include the skill.

Skill `evals/evals.json` files contain intent cases. Structural checks do not prove real-model behavior; the new boundary cases remain manual-pending. See the [plan contracts](skills/writing-plans/references/plan-format.md) and [guard boundaries](guardrail/README.md).


```text
request → current facts + necessary general clarifying
   ├─ exploring → investigate / compare → clarify key decisions → decide to implement
   ├─ quick-fix → diagnose + clarify repair → fix → replay actual symptom
   └─ requirement-analysis → general clarification
              ↕ visual-preview + UI clarification (qualifying UI changes)
          approved design + versioned HTML → spec → writing-plans → execution authorization
              ↓
          executing-plans → early real user journey + prototype comparison
              ↓
          final verification → independent review → acceptance-qa → reconciliation → delivery

acceptance-qa: verify basis/evidence → compare actual page/behavior → fill gaps and report
repairs: classify cause → rerun affected checks → reuse valid evidence → refresh conclusions
```

The three entry points split by commitment and design space: **exploring** (undecided — should we even do this?), **quick-fix** (decided, no design space — a small bug or adjustment), **requirement-analysis** (decided, has design space — a feature or change). quick-fix reuses test-driven-development and acceptance-qa, and hands control back to requirement-analysis the moment a fix turns out to need real design.

All artifacts (specs, plans, acceptance reports, exploration notes, ADRs, roadmaps) live under `.spec-dev/` at the project root; legacy-plan recovery preserves its carrier and historical evidence. Location migration follows the authorization for that operation; the guard still recognizes `docs/`, and the installer retains its separate migration tool and options.

Each skill also works standalone: start from exploring while the idea is unsettled; enter at writing-plans with an existing spec; go straight to executing-plans with an existing plan; acceptance-qa / using-git-worktrees / test-driven-development can be triggered from any workflow; quick-fix handles small already-decided fixes without the full design workflow; clarifying grills an idea into shared understanding without committing to any workflow.

## Installation

### Claude Code

```bash
# Add as a marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev.git#dist

# Install the plugin
/plugin install spec-dev@spec-agent-skills
```

### Codex

```bash
# Add as a marketplace
codex plugin marketplace add https://github.com/FlameMida/spec-dev.git --ref dist

# Install the plugin
codex plugin add spec-dev@spec-agent-skills
```

The Codex manifests (`.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`) also expose plugin UI metadata. After a new release, run `codex plugin marketplace upgrade spec-agent-skills`.

### Pi, Grok Build, and portable plugin packages

```bash
# Pi
pi install git:github.com/FlameMida/spec-dev@dist

# Grok Build
grok plugin install https://github.com/FlameMida/spec-dev.git@dist
```

Grok Build also honors `source.ref: "dist"` in a Claude marketplace plugin entry. Do not apply the direct-install `@dist` suffix to a `grok plugin marketplace add` source URL. Agent Plugins 1.0.0 is a package format and does not specify Git installation; portable hosts consume the distribution workflow's ZIP / tar.gz, while Git ref selection depends on the specific host. npm distribution uses the tgz produced by `npm pack`. These distribution artifacts exclude this repository's `.spec-dev/`; workflows still read and write the user's own project `.spec-dev/` normally.

Git branch selection was tested on 2026-10-23 with Claude Code 2.1.309, Codex CLI 0.164.0, Grok Build 1.0.67, and Pi 1.4.0. With `main` as the fixture repository's default branch, installed caches contained the distinct `dist` marker and no `.spec-dev`. Claude/Codex tests covered both a pinned marketplace branch and a main catalog selecting dist through `source.ref`; Grok tests covered direct installation and catalog `source.ref`.

`main` contains development sources; `dist` contains installable files generated from release tags. New installs should select `dist`. Existing main marketplace entries also redirect plugin installs to `dist`, but their old marketplace source caches are not automatically removed. Existing Pi Git installs must change their source to `@dist` as shown above. Cloning `main` still includes development records; updates do not guarantee removal of old versions retained by a host.

### Platform matrix

| Platform | Skills | Agents (subagents) | Hooks | Manifest |
|---|---|---|---|---|
| Claude Code | ✅ marketplace `skills[]` | ✅ `agents/*.md` | ✅ guardrail install | `.claude-plugin/` |
| Codex | ✅ directory auto-discovery | ⚠️ via dispatch prompts (`spawn_agent` does not read `agents/*.md`) | ✅ codex-hooks | `.codex-plugin/` |
| Grok Build | ✅ zero-config Claude-compat (official claim) | ✅ same as Claude Code (field behavior: see acceptance walkthrough) | ✅ same as Claude Code | reuses `.claude-plugin/` |
| Pi (pi.dev) | ✅ `package.json` `pi.skills` | ⚠️ requires the `pi-subagents` extension | ❌ needs a TS extension (not adapted) | `package.json` |
| Agent plugins 1.0.0 | ✅ root `plugin.json` + `skills/` | — (outside the portable standard) | — (same) | `plugin.json` |

Plugin-level `hooks/hooks.json` auto-registers the SessionStart context injection on platforms that honor plugin hooks (Claude Code / Grok Build) — no manual install needed for injection. `guardrail/install.mjs` remains the way to get the git gate (pre-commit / pre-push / CI) and the PreToolUse / Stop drift guards.

### Model-scoped collaboration

GPT/Codex, Kimi and GLM can receive goal tracking, necessary-work checks, decision filtering, recovery and completion checks. Claude and unknown models are excluded. Selection uses each agent's actual model, including Kimi/GLM inside Claude Code. Both host adapters load one shared policy; see [configuration and limits](guardrail/model-policy.md) for aliases, switches, missing subagent identity and hook trust. Without an enabled hook status, skills do not activate the enhancement.

### Runtime dependencies

| Tier | Dependency | Used by | When missing |
|---|---|---|---|
| hard | `git` | drift guard, worktrees, per-task commits, `sync_commit` anchoring | main workflows unavailable |
| hard | Node.js ≥ 18 | `validate-output.mjs`, guardrail scripts, `doctor.mjs`, the visual-preview server, `node --test` | contract validation, guard, doctor and visual preview unavailable |
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

`package.json.files` is the shared distribution file list. `scripts/build-distribution.mjs` extracts a real npm package and changes its marketplace entries to local paths. The output retains the same plugin-root layout without a second maintained source tree. Output must be a new directory outside the source checkout:

```bash
node scripts/build-distribution.mjs --output /tmp/spec-dev-package
node --test scripts/tests/distribution.test.mjs
```

`.github/workflows/distribution.yml` builds, validates, and updates `dist` after a `v*` tag push, with ZIP, tar.gz, and npm tgz workflow artifacts. It also accepts an existing `vX.Y.Z` tag through manual dispatch. The branch has independent history and ordinary fast-forward updates, excluding source-history `.spec-dev` files. Identical rebuilds are no-ops; older or changed same-version packages are rejected. `.gitattributes` additionally uses `export-ignore` to exclude `.spec-dev` from new Git/GitHub source archives while retaining it in source control. Initial rollout requires a new release tag containing this workflow and a successful first `dist` build.

Validate the real install path with the official Codex CLI:

```bash
node scripts/check-plugin.mjs --codex-validate
```

`--codex-validate` builds the filtered plugin, runs `codex plugin marketplace add <distribution-root>` and `codex plugin add spec-dev@spec-agent-skills` in a temporary `CODEX_HOME`, and checks that the installed cache excludes `.spec-dev` while retaining runtime skills. It does not touch the current user's Codex config or plugin cache. Building the validation package additionally requires npm and tar.

Validate the bundled skills with `skill-creator`'s `quick_validate.py`:

```bash
node scripts/validate-skills.mjs
```

`validate-skills.mjs` also enforces a conservative UTF-8 budget of less than 20,000 bytes per `SKILL.md`. Use `--size-only` for the offline size check; move conditional detail to references with explicit reading points. This budget does not assert that every host truncates at the same character count.

The script looks for the Codex built-in `skill-creator` first, and also supports `SKILL_CREATOR_QUICK_VALIDATE` or `SKILL_CREATOR_HOME` to point at a validator path. If the current Python lacks `PyYAML`, the script installs it into a temporary venv before validating.

### About evals

`skills/*/evals/` holds two kinds of files with different roles:

- `evals.json` — **design-intent documents**: they record the expected key behaviors of each skill (HARD-GATE refusals, handoff gates, degradation paths, etc.) for human review and a future evaluation harness. There is no runner in the repo, and most cases carry conversational preconditions with prose assertions — they are **not** an automated regression line; treat them as a checklist to walk through manually when changing skill behavior
- `trigger-evals.json` — **cold-startable, decidable trigger-surface cases** (should-trigger / should-not-trigger single-shot prompts + near-miss negatives): currently covering seven skills — `acceptance-qa`, `clarifying`, `exploring`, `quick-fix`, `requirement-analysis`, `test-strategy`, `executing-plans`; plug into any evaluation harness and run the verdicts directly

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

The 8-phase design workflow: understanding & triage → parallel exploration (internal + external in one wave) → general clarification plus automatic prototypes and UI clarification → adversarial validation + 2-3 options → full design presentation → write & commit the spec → self-review + adversarial validation → hand off to writing-plans.

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

- **writing-plans**: generates T00, implementation tasks, independent final task F and maximum-numbered delivery task D; acceptance A depends on F when needed. Plans specify scopes, interfaces, changes, validation and ownership, then follow the [plan review checklist](skills/writing-plans/references/plan-review.md).
- **executing-plans**: reuses execution authorization and persisted mode, resumes current work first and verifies writes against committed scopes. Implementation is followed by final, independent review, acceptance and reconciliation. Fixes require affected verification and review. Delivery verifies the merge/squash mapping, transfers originals, cleans owned resources and anchors sync_commit.

## Using visual-preview

Once essential goals are clear, qualifying page, layout and interaction changes automatically open a preview. Exploratory comparisons and diagrams can also be requested directly; see the [prototype contract](skills/visual-preview/references/ui-prototype-contract.md):

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

It follows one evidenced root-cause chain, obtains a real failure signal before confirming a non-obvious cause, and fixes through the approved public seam. Escalation remains a user decision; intermittent behavior alone is insufficient when reproduction conditions are comparable. Existing contract synchronization, TDD and authorization rules remain. Closure compares intermittent failure counts where relevant, accounts for temporary instrumentation, replays the original symptom, and explains the supported cause and verification limits. Independent side issues are recorded for follow-up; original-symptom verification is required and specialist acceptance is invoked as needed.

## No External MCP Service Required

The plugin needs no external MCP service. The controlled review entry point generates a local stdio MCP configuration for restricted tools without registering a global server. Browser automation for Tier A acceptance (playwright / chrome-devtools MCPs) is opt-in per project — see `skills/acceptance-qa/references/mcp-setup.md`; without them acceptance-qa degrades gracefully to the Tier D toolchain (native Playwright tests, traces, console logs).


Check plugin health (platform / guardrail / markers / injection replay / anysearch): `/doctor`

Triage a request to the right lane: `/triage <request>`

### Recorded project progress

Run `node "<absolute-plugin-directory>/scripts/status.mjs"` from any project subdirectory to read all registered worktrees of the same repository, or select a project with `--repo "/project/path"`. Use `--json` for the same snapshot as JSON and `--help` for usage.

The output includes roadmap records, spec lifecycles, plan completion/waiting/blocked records, and their sources. It preserves differing worktree records without selecting a winner. This does not re-run acceptance or verify delivery. Exit 0 means reading completed (blocked tasks and differences are allowed), 1 means partial/invalid input, and 2 means an invocation error. Current v1 template YAML/JSON, v2 JSON, and legacy plan checkboxes are supported; unsupported syntax is diagnosed without migration. The command is read-only, offline, and one-shot, separate from doctor and execution recovery.

Hosts supporting commands can use the status command instructions. Codex uses the plugin prompt entry or the same CLI above; it does not depend on commands being loaded. The script remains in the plugin directory and is not copied into the project.

## Specialized Agents

executing-plans dispatches ready tasks to implementers in independent worktrees by default; dependencies and resource conflicts limit concurrency, explicit serial preferences are honored, and the main thread owns progress and integration, while other agents retain analysis roles:

| Agent | Purpose | Where it's used |
|-------|------|---------|
| **code-explorer** | Deep codebase analysis | requirement-analysis phase 2 parallel exploration |
| **external-resource-explorer** | External resource research with citable evidence | requirement-analysis phase 2 external wave and follow-up exploration |
| **code-reviewer** | Code review, spec conformance and optional architecture deepening | Shared wrap-up review; coverage checking remains a separate critic |
| **implementer** | Single-task TDD and self-check | executing-plans parallel mode, isolated worktrees |

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
├── agents/                          # 4 agents, including isolated implementer
├── commands/                        # /doctor, /triage commands
├── guardrail/                       # spec drift guard (installable into target repos)
├── skills/
│   ├── wtf/                         # plain explanations, mostly terminal diagrams
│   ├── ddd-lifecycle/               # DDD lifecycle workflow
│   ├── exploring/                   # exploration mode (thinking partner)
│   ├── clarifying/                  # shared clarification discipline (grill-style)
│   ├── requirement-analysis/        # 8-phase requirement design workflow
│   ├── visual-preview/              # browser visual preview
│   ├── writing-plans/               # implementation plan writing
│   ├── executing-plans/             # plan execution + wrap-up review
│   ├── using-git-worktrees/         # isolated workspace discipline
│   ├── test-driven-development/     # TDD discipline
│   ├── test-strategy/               # test strategy discipline (lanes / governance / acceptance-matrix link)
│   ├── acceptance-qa/               # all-round acceptance workflow
│   ├── quick-fix/                   # lightweight bug-fix workflow
│   └── anysearch/                   # vendored real-time search CLI (upstream snapshot)
├── scripts/
│   ├── check-plugin.mjs             # manifest version sync + symlink + Codex CLI install checks
│   ├── validate-output.mjs          # subagent output contract validator + plan-index structure check
│   ├── schemas/                     # 4 output contract schemas + 1 vendored manifest schema + usage notes
│   ├── validate-skills.mjs          # validates skills via skill-creator
│   ├── check-openai-sync.mjs        # openai.yaml structure & SKILL sync tripwire
│   ├── doctor.mjs                   # /doctor health checks (platform / guardrail / markers / injection / anysearch)
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
The [shared loading convention](skills/requirement-analysis/references/exploration-entry.md#技能定义与流程调用) distinguishes mentioning a skill, consuming its rules and handing off a workflow. A missing native loader does not imply a missing skill, and reading instructions does not authorize implementation.
The existing exploration-patterns.md remains a valid navigation entry. Plugin-root resolution, dispatch/recovery and output contracts each retain one complete authoritative definition.
The planning fields and resource ledger live in writing-plans/references/plan-format.md; generated plans carry change notes, concrete assertions, commands and interfaces, with snippets included when needed and each task file capped at 200 lines.
DDD uses .spec-dev/glossary.md, feature-local spec terms and .spec-dev/adr/ in both standalone and delegated use.
Write only after design or document-saving authorization; reuse same-scope decisions and do not migrate existing documents automatically.
AnySearch and its upstream update behavior remain unchanged, including its existing invocation rules.
Structure, document contracts and actual model behavior are separate verification results; shorter text is not evidence of improved model behavior.
