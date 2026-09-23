# spec-dev Drift Guard (guardrail)

English | [简体中文](README.zh-CN.md)

Stops documentation drift caused by "a successor skips the spec-dev workflow and changes code without syncing the spec". Layered defenses: tool-agnostic hard blocking + Claude/Codex tool-surface interception + soft reminders.

## One-command install into a target repo

```bash
node guardrail/install.mjs [--repo <path>] [--no-git-hook] [--no-ci] [--no-migrate]
```

Installs into the current git repository by default; idempotent and safe to re-run.

> **Running the installer inside the Codex sandbox**: the Codex workspace-write sandbox forces git config and `.codex/` read-only (anti-privilege-escalation), so the `core.hooksPath` config and `.codex/hooks.json` fail to write inside the sandbox. Run the installer outside the sandbox (user terminal); defenses that do install inside the sandbox still work, and the versioned `.githooks/` files land normally.

## Defense layers

| Layer | Mechanism | Scope | Bypassable |
|---|---|---|---|
| Edit-time interception · Claude | `.claude/settings.json` PreToolUse hook (exit code 2 blocks); passes once the spec is already synced in the working tree | Claude Code sessions | Switch tools to bypass |
| Wrap-up audit · Claude | Stop hook runs a drift check over the whole working tree — shell writes (`sed -i`, `cat >`, etc.) can't escape it; legacy drift blocks once per turn; invalid task bindings always block | Claude Code sessions | Switch tools to bypass |
| Edit-time interception · Codex | `.codex/hooks.json` PreToolUse hook (exit code 2 blocks) | Codex sessions | Switch tools to bypass |
| Commit-time interception | Versioned `.githooks/pre-commit` (enabled via `core.hooksPath`; the package.json `prepare` script auto-configures it on install, so fresh clones carry the gate) | All local commits, any editing tool | `--no-verify` bypasses |
| Push-time interception | Versioned `.githooks/pre-push` re-checks the whole range to be pushed, catching commits that slipped through `--no-verify` | All local pushes | `--no-verify` bypasses |
| **Last line** | `.github/workflows/spec-dev-drift-guard.yml` | **All pushes/PRs, tool-agnostic** | Repository policy must require this check |
| Session self-heal | SessionStart hook → `session-context.mjs`: injects workflow obligations + guard health self-check (when it finds e.g. `core.hooksPath` disabled, it asks the in-session agent to fix it on the spot) | Claude / Codex sessions | Advisory only |
| Soft reminder | Guard sections in `CLAUDE.md` / `AGENTS.md` | Each AI tool | Advisory only |

`check-spec-drift.mjs` checks each Git view; `task-binding.mjs` manages local references and commit associations. Drift entry modes are (`--staged` / `--range` / `--push` / `--hook` / `--worktree`).

## Detection logic

Each spec's frontmatter `spec_dev.covers` (glob) declares the code it owns. A batch of changes that hits the `covers` of a `status: active` spec without also touching that spec is judged as drift. When a spec is superseded its covers leave the blocking set — the successor spec must take over the still-existing paths, or those paths fall into an unguarded vacuum; the supersede write-back is enforced by spec-dev's executing-plans wrap-up.

The frontmatter `sync_commit` is the delivery anchor: the commit where code and this spec were last confirmed in sync — written by the executing-plans wrap-up after merge; `git diff <sync_commit>..HEAD -- <covers>` shows code drift since. The guard parses this field but it plays no part in blocking decisions. A superseded spec's `sync_commit` is frozen at the supersede commit and never updated afterwards.

At edit time (`--hook`), "already synced" includes existing working-tree changes (staged + unstaged + untracked): **update the spec first, then touch the covered code, and you pass**; dirty files in the working tree do not expand the trigger set, and editing unrelated files is unaffected by pre-existing drift. The wrap-up audit (`--worktree`) uses the whole working tree as the change set, backstopping files written by tools that bypassed the tool surface within the turn.

Explicit parallel execution uses `executing-plans-parallel` only with declared independent writes and isolated resources; default execution stays serial. Only its implementer writes claimed code in isolated worktrees. `Spec: <repo-relative spec path>` is a traceability trailer, not a drift-guard bypass.

## Task-scoped authorization

The coordinator commits the spec, plan and exact writes, then commits the task binding in `progress.yaml` to obtain an authority SHA. Legacy single-file plans retain their format and committed scope declaration. Activate the reference inside its assigned worktree:

```bash
node scripts/spec-dev/task-binding.mjs bind --plan .spec-dev/<feature>/plan/index.md --task T01 --authority <full-SHA>
node scripts/spec-dev/task-binding.mjs inspect
node scripts/spec-dev/task-binding.mjs clear --plan .spec-dev/<feature>/plan/index.md --task T01
```

The local reference lives in the actual Git dir and grants no authority by itself. Changed specs, tasks, writes, worktrees or claims require revalidation. The guard checks scope; tests and review check behavior. Behavior changes still require a spec update.

`prepare-commit-msg` adds one `Spec-Task` JSON line from a valid binding. `commit-msg` checks the final message after existing hooks run. History checks use that association and committed views, independently of the current checkout. Missing source Git objects fail verification. Installation includes all required pure modules and needs no plugin cache.

A task association cannot coexist with `Spec-Guard: off` or `SPEC_DEV_GUARD=off`. Clear its local reference before using an authorized legacy exception. An ordinary `Spec:` trailer remains traceability only.

## Temporary bypass (no task association)

- Recommended: leave a `Spec-Guard: off <reason>` trailer in the commit message — the range checks in pre-push and CI recognize it and let the commit through (printing a count for human review), consistent across the chain.
- One-off command: `SPEC_DEV_GUARD=off git commit …` (warns then passes; leaving the trailer as well is recommended, otherwise push/CI range checks still block).
- Pure-documentation features need no guard: leave `covers` as `[]`.

## Superseding

`superseded` is a lifecycle terminal state, not a bypass: mark a spec superseded only together with `superseded_by` pointing to its successor spec (repo-root-relative path) in the same change, and the successor's covers must take over the old spec's still-existing paths. When you land on a superseded spec, follow the pointer to the successor — never base new work on it; if a feature is simply deleted, write a lightweight REMOVED-only successor spec to record the reason.

## Files

```
guardrail/
├── check-spec-drift.mjs      # core validator (zero dependencies)
├── task-binding.mjs          # bind / inspect / clear / message hooks
├── lib/                      # installed shared parsers and Git views
├── session-context.mjs       # SessionStart context injection + guard health self-check
├── install.mjs               # installer
└── templates/
    ├── claude-settings.json  # Claude hooks fragment (PreToolUse + Stop + SessionStart)
    ├── codex-hooks.json      # Codex hooks fragment
    ├── pre-commit            # versioned git hook (chains legacy .git/hooks)
    ├── prepare-commit-msg    # Spec-Task association
    ├── commit-msg            # final message validation
    ├── pre-push              # versioned git hook (second gate)
    ├── github-workflow.yml   # CI
    ├── CLAUDE.md.snippet     # Claude soft reminder
    └── AGENTS.md.snippet     # Codex soft reminder
```

## Known limitations

- The guard block injected into an existing custom hooks directory (e.g. husky) captures stdin first, feeds it to the guard, then restores it to the host hook via `exec <<heredoc` — the host script still reads its refs; very old `sh` without heredoc-`exec` support needs manual adjustment. The template hook has no such concern (captures stdin first, then forwards).
- For a new ref without a trustworthy remote boundary, pre-push checks all reachable history. Existing refs are checked separately; synchronization cannot be borrowed across refs.
