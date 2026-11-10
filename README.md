# spec-dev

**English | [简体中文](README.zh-CN.md)**

> From an idea to a design, from a design to a plan, and from a plan to evidence-backed delivery.

[Changelog](CHANGELOG.md) · [License](LICENSE) · [Issues](https://github.com/FlameMida/spec-dev/issues)

**spec-dev** is a spec-driven development plugin for Claude Code, Codex, Grok Build, Pi, and generic Agent Plugins hosts. It turns a request into an approved one-page spec, decomposes the spec into independently verifiable tasks, and implements them one by one with TDD in an isolated workspace. When all tasks are done it asks you before running regression tests, acceptance, or delivery.

It is not a rigid pipeline that must always start at the beginning: its 13 skills work together or independently. Use `exploring` before committing to implementation, `quick-fix` for small bugs, `writing-plans` when a spec already exists, and `executing-plans` when a plan already exists. Skills depend only on files inside `skills/`, so a skills-only install runs the whole workflow. DDD modeling, browser prototypes, live search, and `wtf` terminal diagrams are also included.

<a id="overview"></a>
## Overview and end-to-end workflow

```mermaid
flowchart TD
    A["User request"] --> B{"Committed to implementation?"}
    B -->|"Not yet"| C["exploring<br/>Investigate, compare, run authorized spikes"]
    C -->|"Ready to implement"| D["requirement-analysis<br/>Requirement design"]
    B -->|"Yes"| E{"Any design space?"}
    E -->|"No: small fix"| F["quick-fix<br/>Diagnose, TDD, replay original symptom"]
    F --> Z["Outcome and evidence"]
    E -->|"Yes: feature or behavior change"| D
    D --> G["Explore + clarifying<br/>One design proposal, one approval"]
    G -.-> H["visual-preview<br/>Automatic for qualifying UI changes"]
    H -.-> G
    G --> I["One-page spec<br/>Requirements + Scenarios"]
    I --> J["writing-plans<br/>Tasks, interfaces, TDD steps"]
    J --> K{"Execution authorized by user"}
    K --> L["executing-plans<br/>Worktree, task loop, light review"]
    L --> M["Ask gate<br/>You choose regression / acceptance / delivery"]
    M --> N["Run what you chose<br/>Requirement reconciliation and summary"]
    N --> Z
```

The three main entry points are routed by **commitment to delivery** and **design space**. The main workflow reuses disciplines such as `using-git-worktrees` and `test-driven-development`; `anysearch`, `ddd-lifecycle`, and `wtf` also work on their own. Approving a design and approving a plan are separate decisions, and reading documents or generating a plan never starts implementation. Regression tests and acceptance run only after you choose them.

<a id="navigation"></a>
## Quick navigation

- **[Quick start](#quick-start)** — [Install](#install) · [First use](#first-run) · [Platform support](#platform-support) · [Runtime dependencies](#runtime-dependencies)
- **[Skill guide](#skill-guide)** — [Think and design](#design-skills) · [Plan and execute](#delivery-skills) · [Quality and repair](#quality-skills) · [Search and explain](#utility-skills)
- **[Mechanisms, benefits, and characteristics](#mechanics)** — artifact contracts, approval boundaries, interruption recovery, quality evidence, drift guards, and cross-platform degradation
- **Reference** — [Utility commands](#commands) · [Maintenance and releases](#maintenance) · [Directory layout](#directory-layout)

---

<a id="quick-start"></a>
## Quick start

### 1.1 Prerequisites

For the complete development workflow, you should have:

- a supported agent host and a Git project;
- `git` for worktrees, task commits, delivery, and drift guards;
- **Node.js ≥ 18** for contract validation, guardrails, doctor, and the visual-preview server;
- browser, performance, or AI-driven acceptance tools only when the corresponding checks need them.

> **Install from `dist`.** The `main` branch contains development sources; `dist` contains installable files generated from release tags and excludes this repository's own development `.spec-dev/` archive. After installation, spec-dev still reads and writes **your project's** `.spec-dev/` normally.

<a id="install"></a>
### 1.2 Install the plugin

#### Claude Code

Run these commands in Claude Code:

```bash
/plugin marketplace add https://github.com/FlameMida/spec-dev.git#dist
/plugin install spec-dev@spec-agent-skills
```

#### Codex

Run these commands in a terminal:

```bash
codex plugin marketplace add https://github.com/FlameMida/spec-dev.git --ref dist
codex plugin add spec-dev@spec-agent-skills
```

After a new release, run `codex plugin marketplace upgrade spec-agent-skills`. Codex 0.164.0 should use the Git `dist` entry above. After installation, the plugin page should list four hooks; review and trust them before use. The plugin never grants trust automatically.

#### Pi and Grok Build

```bash
# Pi
pi install git:github.com/FlameMida/spec-dev@dist

# Grok Build direct installation
grok plugin install https://github.com/FlameMida/spec-dev.git@dist
```

Grok Build also honors `source.ref: "dist"` in a marketplace plugin entry. Do not mechanically apply the direct-install `@dist` suffix to a `grok plugin marketplace add` source URL.

#### Generic Agent Plugins 1.0.0 packages

Portable hosts can consume the ZIP / tar.gz produced by the distribution workflow; npm distribution uses the tgz produced by `npm pack`. Agent Plugins 1.0.0 specifies a package format, not a universal Git installation command, so Git ref selection depends on the host. Portable packages retain the root `plugin.json`; the Git `dist` package omits it for Codex hook compatibility.

<a id="first-run"></a>
### 1.3 First use: start with a real request

The examples below are **natural-language prompts for your agent**, not shell commands, so they do not depend on one host's invocation prefix. You can also use the skill command displayed by your host; hosts with plugin namespaces may show `/spec-dev:<skill>`.

#### Route A: complete feature delivery

1. **Design the requirement**

   > Use requirement-analysis to design team-member invitations for this project, including permissions, failure paths, and acceptance criteria.

2. **Review and approve the design**. The agent investigates the current system, clarifies one decision at a time, then presents the recommended approach, alternatives, and a one-page spec draft in a single message. Only after your approval does it write the spec and continue to the plan. A typical location is:

   ```text
   .spec-dev/<date-sequence-feature>/spec/<feature>-design.md
   ```

3. **Create an implementation plan**

   > Use writing-plans to turn .spec-dev/&lt;feature&gt;/spec/&lt;feature&gt;-design.md into an independently verifiable implementation plan.

4. **Review the plan and explicitly authorize execution**

   > Use executing-plans to execute .spec-dev/&lt;feature&gt;/plan/&lt;feature&gt;-plan.md.

5. **Choose at the ask gate**. After all tasks and a light review, the workflow shows a summary and the Requirement reconciliation, then asks once: regression (none / affected scope / full suite), how to check each acceptance item (you / the agent / skip), and delivery (local merge / PR / keep the branch). Anything you do not choose is not run and is reported as such.

#### Route B: you have not decided whether to build it

> Use exploring to help me decide whether this project needs real-time collaboration. Compare server push with polling in the current codebase; do not implement anything yet.

#### Route C: a small, already-decided fix

> Use quick-fix to repair duplicate rows on the last pagination page. Reproduce the root cause first, fix it with TDD, and replay the original request.

If you are unsure which route to take, start with `/triage <request>`. It only recommends a route, writes no files, and leaves the final choice to you.

### 1.4 Verify installation and optionally enable drift guards

- On hosts that support commands, run `/doctor` to inspect the platform, guardrail, injection markers, SessionStart hooks, and anysearch health.
- Plugin-level `hooks/hooks.json` automatically registers session-context injection on supported hosts; **this does not install the complete drift guard**.
- To enable PreToolUse / Stop, pre-commit / pre-push, and CI defenses, install the guardrail into the target project:

  ```bash
  node "/actual/plugin/directory/guardrail/install.mjs" --repo "/absolute/path/to/your/project"
  ```

  The installer is idempotent; replace the plugin path with its actual location. If the Codex sandbox denies writes to Git configuration, the user should run the installer outside the sandbox. See the [guardrail guide](guardrail/README.md).

<a id="platform-support"></a>
### 1.5 Platform support

| Platform | Skills | Agents (subagents) | Hooks | Manifest / discovery |
|---|---|---|---|---|
| Claude Code | ✅ marketplace `skills[]` | ✅ generic subagents + briefs inside skills | ✅ plugin injection; guardrail install available | `.claude-plugin/` |
| Codex | ✅ directory auto-discovery | ✅ generic subagents + briefs inside skills | ✅ codex-hooks; trust required | `.codex-plugin/` |
| Grok Build | ✅ Claude-compatible (official claim) | ✅ same as Claude Code; behavior subject to actual acceptance | ⚠️ hook support differs; SessionStart does not inject model context, PostModelSwitch is unsupported | reuses `.claude-plugin/` |
| Pi | ✅ `package.json` `pi.skills` | ⚠️ requires the `pi-subagents` extension; otherwise the main thread does the work and says so | ❌ requires a separate TS extension adaptation | `package.json` |
| Agent Plugins 1.0.0 | ✅ root `plugin.json` + `skills/` | — outside the portable standard | — outside the portable standard | `plugin.json` |
| Skills only (copy or sync the `skills/` directory) | ✅ full workflow | depends on the host; otherwise the main thread does the work and says so | — no hooks, commands, or guard scripts | the host's own skills directory |

Skill text describes capabilities (asking the user, subagents, progress tools, isolated workspaces) and never host-specific tool names; the mapping lives in [host compatibility](skills/requirement-analysis/references/host-compat.md).

<a id="runtime-dependencies"></a>
### Runtime dependencies

| Tier | Dependency | Used by | When missing |
|---|---|---|---|
| hard | `git` | drift guard, worktrees, per-task commits | main workflows unavailable |
| hard | Node.js ≥ 18 | contract validation, guardrail scripts, doctor, visual-preview, `node --test` | related validation and preview unavailable; degrade and report as documented |
| soft | `python3` | anysearch Python CLI | falls back to the zero-dependency Node CLI, then WebSearch / WebFetch |
| soft | ego-lite + official `ego-browser` skill | browser previews, page acceptance, and diagnosis | follow the official setup guide; affected browser checks remain `unverified` |
| soft | existing Playwright Test / k6 / Lighthouse | deterministic E2E and specialist checks | run applicable existing tools, or mark the row `unverified` |
| soft | `codex` CLI, `skill-creator` | repository development and release checks only | corresponding development checks skip softly |

For browser work, install [ego-lite and its official `ego-browser` skill](https://lite.ego.app/document/en/docs/quick-start). Read that skill, run `ego-browser skill`, and read the complete version-matched guide before operating the browser. Spec-dev does not bundle the official skill or register browser MCPs; see [browser setup](skills/acceptance-qa/references/browser-setup.md). Existing Playwright Test/CLI suites remain supported independently.

Review and exploration subagents report in Markdown following the briefs inside the skills, and the main thread verifies their findings; no validation script is involved. On hosts without subagents the main thread does the work and states that it was not independent.

---

<a id="skill-guide"></a>
## Skill guide

Every skill can be invoked independently or reused by the main pipeline. Each example below is a natural-language prompt you can adapt directly. If your host provides `/`, `$`, or another skill invocation syntax, you can use that form instead.

<a id="design-skills"></a>
### 2.1 Think, clarify, and design

<a id="skill-exploring"></a>
#### `exploring` — a thinking partner before implementation is committed

**Purpose:** Read code, investigate questions, and compare directions while delivery is still undecided. It is read-only by default; a question that genuinely requires execution can use an isolated, explicitly authorized spike. Exploration does not have to produce a conclusion and never automatically writes production code or saves notes.

**Examples:**

> Use exploring to help me decide whether this project needs real-time collaboration. Compare polling and server push against the current codebase; do not implement anything yet.

> Use exploring to investigate three implementation directions for audit logging, preserving their assumptions and trade-offs. We can stop once the question is clear enough.

<a id="skill-clarifying"></a>
#### `clarifying` — reach shared understanding one decision at a time

**Purpose:** Clarify an idea, plan, or decision along a decision tree. The agent checks facts it can answer itself and brings only genuine user decisions to the conversation, one at a time, preferably as mutually exclusive options with a recommendation. Standalone sessions end with a consensus summary and three exits: enter a main workflow, stop, or save Markdown. When referenced by another workflow, those extra exits are not imposed.

**Examples:**

> Use clarifying to grill my offline-sync proposal one question at a time until the goals, conflict rules, and boundaries are explicit.

> Use clarifying to identify the remaining decisions in this plan that genuinely require me. Do not ask about facts you can verify in the codebase.

<a id="skill-requirement-analysis"></a>
#### `requirement-analysis` — turn a committed request into an approved spec

**Purpose:** Designed for new features, APIs, data design, and behavior changes with meaningful trade-offs. Four steps: explore, clarify, propose the design, write the spec. light / standard / deep only adjust exploration depth; you approve the design once, and it hands off to `writing-plans`. The spec is a one-page contract (goal, non-goals, key decisions, Requirements and Scenarios) without frontmatter by default; add frontmatter only when you want the drift guard.

**Examples:**

> Use requirement-analysis to design tenant-level API keys, including creation, rotation, revocation, permissions, and auditing, and produce a spec.

> Use requirement-analysis to redesign notification retries. Compare viable approaches first and do not change code before I approve the design.

<a id="skill-visual-preview"></a>
#### `visual-preview` — interactive HTML prototypes in the browser

**Purpose:** Present mockups, layout comparisons, diagrams, and important interface states, with clicks and choices flowing back into the session. It activates automatically under its contract for new pages, redesigns, major layout changes, and core interaction changes. Small changes may skip it, and an explicit opt-out is preserved. Visual questions go to the browser; ordinary text trade-offs stay in the conversation. Before drawing, it inventories the project's stack, shared wrapper components, and layout; the approved prototype is drawn with them and ships with a component mapping table. When the project has no frontend yet, it first asks about and recommends a stack. Prototypes are opened in front of the user, who reviews the approved prototype as a whole before design approval is requested.

**Examples:**

> Use visual-preview to show two dashboard layouts side by side in the browser so I can click to choose one and keep iterating.

> Use visual-preview to prototype loading, empty, error, and permission-denied states for the project-list page.

<a id="skill-ddd-lifecycle"></a>
#### `ddd-lifecycle` — from domain modeling to hexagonal architecture

**Purpose:** Language-independent DDD guidance covering ubiquitous language, bounded contexts, entities / value objects / aggregates, domain events, repositories, Ports & Adapters, migration, and ADRs. Use it for greenfield modeling, everyday DDD decisions, or model-consistency reviews. It does not equate bounded contexts with microservices or force a rich model onto simple CRUD.

**Examples:**

> Use ddd-lifecycle to establish a ubiquitous language for orders, payments, and refunds, define bounded contexts, and design aggregate boundaries.

> Use ddd-lifecycle to review dependency direction in the current domain model, identify logic that belongs in domain, and decide which choices deserve ADRs.

<a id="delivery-skills"></a>
### 2.2 Plan, isolate, and execute

<a id="skill-writing-plans"></a>
#### `writing-plans` — decompose a spec into verifiable tasks

**Purpose:** Turn an approved spec or explicit requirement into one `plan/<feature>-plan.md` file: a header (goal, non-goals and global constraints, test commands, pre-decided wrap-up), task navigation, each task's interfaces and five TDD steps, and an execution record. Tasks are behavior slices that can be delivered independently, and Scenario names become test names. Workspace isolation, regression, acceptance, and merging are not plan tasks. Approving the plan authorizes execution.

**Examples:**

> Use writing-plans to create an implementation plan from .spec-dev/&lt;feature&gt;/spec/&lt;feature&gt;-design.md, with task dependencies and each task's interfaces spelled out.

> Use writing-plans to revise this plan so the first real user flow comes first. For wrap-up I want the affected-scope regression only, no acceptance, and a PR.

After writing, the plan is checked with the five self-checks in the skill (coverage, executability, interface consistency, minimal dependencies, a real first loop); see the [plan template](skills/writing-plans/references/plan-template.md). You then decide whether to execute or revise.

<a id="skill-executing-plans"></a>
#### `executing-plans` — execute, resume, and deliver through the ask gate

**Purpose:** Execute an approved written plan. It sets up an isolated workspace (no tests run before work starts), then the main thread implements tasks in dependency order with TDD, one commit and a self-check per task. Each task starts by rereading the plan header, does only what the task says, and never edits committed test assertions to get green. After the last task it runs one light independent review, then stops at the ask gate: regression, acceptance, and delivery all wait for your choice. Recovery relies only on the plan file and Git history.

**Examples:**

> Use executing-plans to execute .spec-dev/&lt;feature&gt;/plan/&lt;feature&gt;-plan.md, and ask me before running regression or acceptance.

> Use executing-plans to resume the plan interrupted in my previous session. Check the checkboxes, the workspace, and the latest commits first; do not redo finished tasks.

<a id="skill-using-git-worktrees"></a>
#### `using-git-worktrees` — prepare an isolated workspace

**Purpose:** Detect existing isolation first. Always create new worktrees under the project root's `.worktrees/` with `git worktree add`; a host's native tool is fine when it can target that path. Existing workspaces stay where they are. The workspace is ready once the actual working directory is confirmed and dependencies are installed; no tests are run.

**Examples:**

> Use using-git-worktrees to prepare an isolated workspace for the billing feature and install the necessary dependencies.

> Use using-git-worktrees to check whether I am already in an isolated environment; do not create another worktree if one is active.

<a id="quality-skills"></a>
### 2.3 Repair, test, and accept

<a id="skill-quick-fix"></a>
#### `quick-fix` — evidence-backed lightweight repair

**Purpose:** Handle a small bug or adjustment that is already decided and has no design space. It follows root-cause diagnosis and spec lookup → focused clarification → TDD repair → original-symptom replay. Cross-spec or cross-module work, new dependencies, contract conflicts, or insufficient evidence trigger an escalation proposal rather than turning a small fix into a design bypass.

**Examples:**

> Use quick-fix to repair duplicate records caused by a pagination off-by-one error. Capture a real failure signal first, then fix it and replay the original request.

> Use quick-fix to diagnose why the Save button intermittently stops responding. Keep it lightweight, but let me choose an escalation if the evidence shows cross-module design work.

<a id="skill-test-driven-development"></a>
#### `test-driven-development` — valid red to a minimal green implementation

**Purpose:** Write a behavior test at the approved public seam, run it to confirm that the failure reflects the target behavior, implement the minimum, and verify green. Compilation errors, missing environments, zero tests, and SKIP are neither valid behavioral red nor passing evidence. Pure refactoring uses before-and-after behavior protection; retrospective tests record comparative evidence without fabricating test-first history.

**Examples:**

> Use test-driven-development to add expiry behavior to password-reset links, beginning with a failing test at the existing public service boundary.

> Use test-driven-development to fix this validation bug, preserving the actual commands and results for valid red, minimal implementation, and the relevant checks turning green.

<a id="skill-acceptance-qa"></a>
#### `acceptance-qa` — check against a list, you judge

**Purpose:** Accept features, pages, or APIs and diagnose failures. It runs only when you call it directly or select it at the ask gate of a plan. The acceptance checklist is generated at that moment from the Scenarios and the actual changes; every item shows the expected and the observed raw result side by side, and you judge. It supports unit / integration / E2E / visual / a11y / perf-web / perf-api / diagnose / all, and marks items `unverified` when tools or conditions are missing instead of turning gaps into passes.

**Examples:**

> Use acceptance-qa to accept the cart page against its active spec and approved prototype, covering success, failure, and permission-denied states, and list any remaining evidence gaps.

> Use acceptance-qa perf-api to load-test the order endpoint in the authorized staging environment with a p95 budget under 300 ms.

<a id="utility-skills"></a>
### 2.4 Real-time search and terminal explanations

<a id="skill-anysearch"></a>
#### `anysearch` — real-time search and page extraction through a bundled CLI

**Purpose:** General web search, vertical-domain retrieval, parallel batch search, and URL content extraction without MCP. It is the preferred external-search entry point for the other workflows; vertical searches first discover the sub-domain and required parameters. Anonymous access is supported, while `ANYSEARCH_API_KEY` only raises rate limits. Queries and URLs are sent to the AnySearch service, so do not submit sensitive information.

**Examples:**

> Use anysearch to find the current official documentation on OAuth token rotation, citing primary sources and noting version freshness.

> Use anysearch to research these three independent topics in parallel, then extract and compare the full text of the most relevant documents.

<a id="skill-wtf"></a>
#### `wtf` — explain it clearly with terminal diagrams

**Purpose:** Explain concepts, code, workflows, or problems in language a 10-year-old can follow, usually through 2–4 terminal character diagrams with a small amount of prose. It lowers the comprehension barrier without deleting important conditions or failure paths. When explaining code, logs, or documents, it reads the source first rather than drawing from guesses.

**Examples:**

> Use wtf to explain caching with terminal diagrams: what it is, why it is faster, and what happens when the cache and database disagree.

> Use wtf to read this request-handling module and draw the complete path from entry to response with a few diagrams and very little text.

<a id="commands"></a>
### 2.5 Utility commands (not part of the 13 skills above)

| Entry | Purpose | Example |
|---|---|---|
| `/doctor` | Inspect platform, guardrail, hook injection, and anysearch health | `/doctor` |
| `/triage` | Recommend a route by commitment, task type, and design space; writes nothing | `/triage Help me choose the right workflow for this request` |
| `status` | Summarize roadmap, spec, and plan records across worktrees in the same Git repository | see the CLI below |

Run a status snapshot from any project subdirectory:

```bash
node "<absolute-plugin-directory>/scripts/status.mjs" --repo "/project/path" --json
```

Omit `--repo` to detect the current repository, or omit `--json` for human-readable output. The command is read-only, offline, and preserves each worktree's sources and disagreements. It neither re-runs acceptance nor verifies delivery facts.

---

<a id="mechanics"></a>
## Mechanisms, benefits, and characteristics

### 3.1 Request triage: match process weight to problem complexity

**Mechanism:** Entry points select `exploring`, `quick-fix`, `requirement-analysis`, or a report channel according to commitment, task type, and design space. A committed repair whose size is unclear can start with quick-fix and escalate based on evidence. Existing decisions and exploration evidence are reused across handoffs.

**Benefit:** Small fixes do not drown in paperwork, while complex features do not skip design. The routing reduces repeated questions, repeated investigation, and restarts after choosing the wrong workflow.

### 3.2 Spec contracts: one language for design, code, tests, and acceptance

**Mechanism:** A spec is a one-page contract: goal and success criteria, non-goals, key decisions, and observable behavior expressed as **Requirement + Scenario (GIVEN / WHEN / THEN)**. `writing-plans` translates Scenarios directly into test steps and reuses their names as test names; the final reconciliation and the acceptance checklist are checked against the same contract. A spec is the contract for one change and is frozen as history after delivery; long-lived behavior is protected by those tests. Only features that want the drift guard add frontmatter (`covers`, `status`, `superseded_by`).

**Benefit:** This reduces translation loss where the requirement says A, the implementation does B, and the tests verify C. One page keeps approval cheap and avoids a pile of unmaintained documents that still claim to be current.

A typical artifact layout is:

```text
.spec-dev/
├── YYYY-MM-DD-NN-<feature>/
│   ├── spec/                 # one-page spec and approved assets
│   ├── plan/
│   │   └── <feature>-plan.md # header, navigation, task checkboxes, execution record
│   ├── visual/               # prototype sessions
│   └── acceptance/           # acceptance report and evidence (when used)
├── explorations/             # exploration / clarification notes saved with authorization
├── roadmaps/                 # multi-project routes and continuation state
├── glossary.md               # cross-feature domain terminology
└── adr/                      # architectural decisions worth preserving
```

Legacy `docs/` artifacts remain readable in place and are never migrated automatically without explicit authorization. Distribution packages exclude the plugin repository's own development archive without affecting user projects.

### 3.3 Approval and authorization boundaries: automation does not decide for the user

**Mechanism:** Exploration and design do not write production code by default. The spec and the plan are written only after the design proposal is approved, execution starts only after the plan is approved, and regression, acceptance, and delivery are asked about once more after the last task. Contract-level deviations, scope growth, deferral, or dropping work go back to the user; ordinary reversible implementation details stay with the agent.

**Benefit:** People retain control over direction, scope, and important trade-offs: a feature stops only three times between request and delivery (design approval, plan approval, ask gate), and execution is not interrupted in between.

### 3.4 The plan is the source of truth: serial execution, recovery from records

**Mechanism:** A plan states real dependencies, each task's interfaces, and independently verifiable boundaries, and the main thread implements it serially in an isolated workspace. Progress is the checkboxes in the plan file; deviations, out-of-task findings, and the delivery method go into the execution record in the same file. Recovery checks only the checkboxes, the actual commits, and the workspace.

**Benefit:** One file supports whole-plan review. There is no separate progress file, binding command, or receipt to maintain; each task is one commit, and interrupted work resumes from actual records.

### 3.5 Verification moves forward: tasks prove themselves, wrap-up asks first

**Mechanism:**

- `test-driven-development` requires valid red, minimal implementation, and real green: every Scenario becomes a failing test at a public boundary first, and red must be the target assertion failing;
- inside a task only the target tests and the project's existing typecheck and lint run; committed test assertions are never edited to get green without asking first;
- every task starts by rereading the plan header and does only what the task says, recording out-of-task findings instead of fixing them;
- after the last task one read-only subagent reviews the change against a brief (two for large changes), and the main thread verifies high and medium findings before fixing;
- the ask gate offers regression as none / affected scope / full suite, and each acceptance item as you / the agent / skip; `acceptance-qa` shows expected and observed results side by side with `pass / warn / fail / unverified`;
- before delivery every Requirement is reconciled, and undelivered ones go to you to finish, defer, or drop.

**Benefit:** Drift shows up within one task rather than at the end. You decide how much regression and acceptance cost to pay, and anything not run is reported as not run instead of being absorbed into "looks fine overall".

### 3.6 A visual loop from prototype to running software

**Mechanism:** `visual-preview` first inventories the project's UI conventions (stack, component library, design tokens, shared wrapper components, layout shell); the approved prototype follows them and carries a component mapping table. It serves versioned HTML locally and opens it for the user, and browser events return with the screen version; adopted prototypes and assets are archived under `spec/assets/`. UI tasks in the plan carry their prototype screens, mapping rows, and a restoration self-check step, so execution compares the page with the prototype side by side once the task turns green. When pages changed, the ask gate still recommends checking them against the approved prototype; if selected, the real page is checked with the same roles, data, actions, viewports, and states.

**Benefit:** Design feedback concerns something visible rather than imagined prose, and delivery is not declared from a screenshot alone. Save, price, and permission outcomes mocked in a prototype still require real business evidence.

### 3.7 Read-only subagents and briefs: clear roles that ship with the skills

| Brief | Responsibility | Location |
|---|---|---|
| Explorer brief | Read-only code analysis, call paths, and impact investigation | `skills/requirement-analysis/references/explorer-brief.md` |
| External research brief | External research with primary-source evidence | `skills/requirement-analysis/references/external-research-brief.md` |
| Reviewer brief | Independent code review and spec-conformance checks | `skills/executing-plans/references/reviewer-brief.md` |

The main thread dispatches a generic subagent and passes the absolute path of the brief in the prompt. Subagents only explore and review, read-only, and report in Markdown; the main thread verifies before relying on them. Without subagent support the main thread follows the same brief and states that the work was not independent.

**Benefit:** Briefs travel with the skills and do not depend on any host's agent-definition directory. Missing capabilities degrade gracefully, but independent review and tool results are never faked.

### 3.8 Spec drift guards: layered defenses for synchronization

**Mechanism:** An active spec with frontmatter declares the code it owns in `covers`. When a change hits those paths without synchronizing the corresponding spec, the guardrail can block it at edit time, wrap-up, commit, push, and CI. While a plan is implementing a spec, the spec stays `draft` on the feature branch and turns `active` in the delivery commit, so task commits are not blocked. The default one-page spec has no frontmatter and does not take part in the guard.

**Benefit:** Documentation freshness no longer depends only on someone remembering to update it, and Git plus CI provide defenses across editing tools. The guard checks scope and synchronization facts, while tests and review remain responsible for behavioral correctness. See the [guardrail guide](guardrail/README.md) for installation and exception boundaries.

### 3.9 Thin skills and progressive loading: one definition, loaded when needed

**Mechanism:** Orchestration skills own flow, while clarification, TDD, the plan template, and host compatibility each have one definition point; templates, briefs, and specialist guidance are loaded right before the action that needs them. Every discovery path points to the same `skills/` directory, and skills depend on nothing outside it.

**Benefit:** Workflows do not drift through copied rules, and irrelevant context stays unloaded. Individual skills remain reusable while the complete pipeline shares consistent constraints. Shorter files or valid structure are never presented as evidence of improved real-model behavior.

### 3.10 Cross-platform, degradable design: no mandatory external MCP

**Mechanism:** Claude Code / Grok Build use the Claude manifest, Codex auto-discovers the skills directory, and Pi / Agent Plugins use their own manifests. The core workflow requires no external MCP. Browser operations use ego-lite through the official `ego-browser` skill and its current runtime guide; specialist test tools remain project-specific. AnySearch is a networked search service with its own degradation path: Python CLI → zero-dependency Node CLI → WebSearch / WebFetch according to the search rules. Missing tools, authorization, or environment conditions produce an explicit degradation or `unverified` result.

**Benefit:** The same core artifacts and work discipline travel across hosts, while optional capabilities are added only when needed. Missing tools do not prevent safe progress on the remaining work, but unexecuted checks are never reported as passes.

### 3.11 Model-scoped collaboration enhancements

**Mechanism:** When an enabled hook explicitly reports the activation state, GPT / Codex, Kimi / Moonshot / GLM can load goal tracking, necessary-work checks, decision filtering, recovery, and delivery-omission checks. Claude and unknown models are excluded. Selection uses the receiving agent's actual model rather than the host name, and a subagent does not inherit activation merely from its parent.

**Benefit:** Different models receive consistent execution discipline without changing approval gates, task scopes, or user authorization. See [model policy](guardrail/model-policy.md) for aliases, switches, and host limits.

---

<a id="maintenance"></a>
## Maintenance and release reference

### Plugin package maintenance

The repository root is the plugin root, and runtime content has a single source tree. The two READMEs are maintained separately for English and Chinese, with no additional mirror directory. A release synchronizes five versions: `metadata.version` in `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, root `plugin.json`, and `package.json`.

With this repository's Git hooks installed, ordinary commits run static package, skill, metadata-sync and staged-diff checks. They do not change versions, amend commits or create tags. Pre-push checks CHANGELOG coverage and remote tag conflicts without creating tags. To release from a clean working tree, run `node scripts/release.mjs <patch|minor|major|X.Y.Z>` (add `--dry-run` to preview): it updates the five versions and CHANGELOG, runs `check-plugin.mjs --codex-validate`, then creates a separate release commit and annotated tag. The installer enables `push.followTags=true` so a later push includes reachable annotated tags. Package installation and hook discovery checks also remain in release CI; run them explicitly after related package/hook changes. The Codex check reports a skip if the CLI is unavailable.

```bash
# Manifest versions, skills[] versus disk, and symlink checks
node scripts/check-plugin.mjs

# Validate real Git-package installation and hook discovery in isolated Codex state
node scripts/check-plugin.mjs --codex-validate

# Validate every skill (including the SKILL.md UTF-8 size budget)
node scripts/validate-skills.mjs

# Build portable / Git packages; output must be a new directory outside the source checkout
node scripts/build-distribution.mjs --output /tmp/spec-dev-package
node scripts/build-distribution.mjs --output /tmp/spec-dev-git-package --format git
node --test scripts/tests/distribution.test.mjs
```

`package.json.files` is the shared distribution list. `.github/workflows/distribution.yml` builds and updates `dist` after a `v*` tag and produces ZIP, tar.gz, and npm tgz workflow artifacts, then creates the GitHub Release with those three files attached and the matching CHANGELOG section as its notes (a rerun only refreshes the attachments). Rebuilding identical output is a no-op; older versions or different content at the same version cannot overwrite the distribution.

### Maturity tiers and release discipline

Stable skills live under `skills/`. Claude Code reads the explicit `skills[]` list in `.claude-plugin/marketplace.json`, and `check-plugin.mjs` verifies it in both directions against on-disk directories. Codex auto-discovers directories, Pi reads `pi.skills`, and Agent Plugins reads the root manifest plus `skills/`.

- Experimental skills live in `skills-in-progress/<name>/`, are absent from every plugin manifest, and promise no stability.
- Graduation requires moving into `skills/`, registering the marketplace entry, adding `agents/openai.yaml` and evals, and updating both READMEs plus CHANGELOG.
- Orchestration follows the thin-shell convention: disciplines reference their authoritative definition instead of creating a second copy. Shared entry points include clarifying, the plan template, the explorer and reviewer briefs, and host compatibility.

### About evals

- `evals.json` is a **design-intent document** covering expected HARD-GATE, handoff, and degradation behavior for human review and future evaluation harnesses. The repository has no general runner for it, so it is not an automated regression line.
- `trigger-evals.json` contains cold-startable, decidable trigger-surface cases (should-trigger / should-not-trigger and near-miss negatives), currently covering `acceptance-qa`, `clarifying`, `exploring`, `quick-fix`, `requirement-analysis`, `executing-plans`; connect them to an evaluation harness to run the verdicts.

Structural checks, document contracts, and real-model behavior evaluations are different forms of evidence and cannot substitute for one another.

### Pre-commit hooks

Repository contributors can enable the versioned Git hooks:

```bash
node scripts/install-git-hooks.mjs
```

Once enabled, commits check the real Codex installation, skills, OpenAI metadata synchronization, and `git diff --cached --check`. A failed check aborts the commit. See `.githooks/` and the maintenance scripts for temporary skip switches and their boundaries.

<a id="directory-layout"></a>
## Directory Layout

```text
spec-dev/                            # repository root = plugin root
├── .claude-plugin/
│   ├── marketplace.json             # Claude marketplace and explicit skills[] list
│   └── plugin.json                  # Claude Code plugin manifest
├── .codex-plugin/plugin.json        # Codex plugin manifest
├── .agents/plugins/marketplace.json # Codex marketplace configuration
├── .githooks/                       # commit checks and release hooks
├── commands/                        # doctor / triage / status
├── guardrail/                       # spec drift guard installable into target repositories
├── hooks/                           # Claude / Codex lifecycle hooks
├── skills/
│   ├── exploring/                   # exploration before implementation commitment
│   ├── clarifying/                  # shared one-question-at-a-time clarification
│   ├── requirement-analysis/        # requirement design and specs
│   ├── visual-preview/              # browser HTML prototypes and approved archives
│   ├── ddd-lifecycle/               # DDD modeling, architecture, and ADRs
│   ├── writing-plans/               # verifiable tasks and implementation plans
│   ├── executing-plans/             # execution, recovery, review, and delivery
│   ├── using-git-worktrees/         # isolated-workspace discipline
│   ├── test-driven-development/     # valid red-green and refactor protection
│   ├── quick-fix/                   # lightweight diagnosis and repair
│   ├── acceptance-qa/               # acceptance, specialist testing, and diagnosis
│   ├── anysearch/                   # real-time search and page-extraction CLI
│   └── wtf/                         # plain-language terminal diagrams
├── scripts/
│   ├── check-plugin.mjs             # manifest, directory, and Codex installation checks
│   ├── validate-output.mjs          # generic JSON schema validation
│   ├── schemas/                     # vendored manifest schema
│   ├── validate-skills.mjs          # skill structure and size validation
│   ├── check-openai-sync.mjs        # openai.yaml synchronization check
│   ├── doctor.mjs                   # health diagnostics
│   ├── status.mjs                   # read-only cross-worktree progress snapshots
│   ├── update-vendored-skill.mjs    # sync vendored skills from upstream
│   ├── build-distribution.mjs       # build portable / Git distributions
│   └── release.mjs                  # release script
├── CHANGELOG.md
├── README.md                        # English
├── README.zh-CN.md                  # Simplified Chinese
└── LICENSE
```

---

**Author:** [FlameMida](https://github.com/FlameMida) · **License:** [MIT](LICENSE) · **Detailed history:** [CHANGELOG.md](CHANGELOG.md)

Issues and pull requests are welcome. For behavior changes, update the owning spec's requirements in the same change, and follow the repository's tests and release checks.
