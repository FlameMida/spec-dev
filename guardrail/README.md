# spec-dev Drift Guard (guardrail)

English | [简体中文](README.zh-CN.md)

Stops documentation drift caused by "a successor skips the spec-dev workflow and changes code without syncing the spec". Layered defenses: tool-agnostic hard blocking + Claude/Codex tool-surface interception + soft reminders.

## One-command install into a target repo

```bash
node guardrail/install.mjs [--repo <path>] [--no-git-hook] [--no-ci]
```

Installs into the current git repository by default; idempotent and safe to re-run. Legacy artifacts under `docs/` stay in place. After explicit migration authorization, run `node scripts/spec-dev/migrate-to-spec-dev.mjs --repo <path>` separately; the migration command does not commit.

> **Running the installer inside the Codex sandbox**: the Codex workspace-write sandbox forces git config and `.codex/` read-only (anti-privilege-escalation), so the `core.hooksPath` config and `.codex/hooks.json` fail to write inside the sandbox. Run the installer outside the sandbox (user terminal); defenses that do install inside the sandbox still work, and the versioned `.githooks/` files land normally.

## Model-scoped collaboration

The installer also copies model-scoped collaboration guidance and merges lifecycle hooks for both hosts. This is independent of spec discovery and adds no blocking gate. GPT/Codex, Kimi and GLM are enabled; Claude and unknown models are excluded. See [model policy](model-policy.md) for aliases, switching and subagent limits.

## Defense layers

| Layer | Mechanism | Scope | Bypassable |
|---|---|---|---|
| Edit-time interception · Claude | `.claude/settings.json` PreToolUse hook (exit code 2 blocks); passes once the spec is already synced in the working tree | Claude Code sessions | Switch tools to bypass |
| Wrap-up notice · Claude | Stop runs `--worktree --warn-only` over the whole working tree, including shell writes; drift produces a `systemMessage` and exit 0 without blocking completion | Claude Code sessions | Advisory only |
| Edit-time interception · Codex | `.codex/hooks.json` PreToolUse hook (exit code 2 blocks) | Codex sessions | Switch tools to bypass |
| Commit-time interception | Versioned `.githooks/pre-commit` (enabled via `core.hooksPath`; the package.json `prepare` script auto-configures it on install, so fresh clones carry the gate) | All local commits, any editing tool | `--no-verify` bypasses |
| Push-time interception | Versioned `.githooks/pre-push` re-checks the whole range to be pushed, catching commits that slipped through `--no-verify` | All local pushes | `--no-verify` bypasses |
| **Last line** | `.github/workflows/spec-dev-drift-guard.yml` | **All pushes/PRs, tool-agnostic** | Repository policy must require this check |
| Session self-heal | SessionStart hook → `session-context.mjs`: injects workflow obligations + guard health self-check (when it finds e.g. `core.hooksPath` disabled, it asks the in-session agent to fix it on the spot) | Claude / Codex sessions | Advisory only |
| Soft reminder | Guard sections in `CLAUDE.md` / `AGENTS.md` | Each AI tool | Advisory only |

`check-spec-drift.mjs` is the only validator. Its entry modes are (`--staged` / `--range` / `--push` / `--hook` / `--worktree`).

## Detection logic

Each spec's frontmatter `spec_dev.covers` (glob) declares the code it owns. A batch of changes that hits the `covers` of a `status: active` spec without also touching that spec is judged as drift. When a spec is superseded its covers leave the blocking set — the successor spec must take over the still-existing paths, or those paths fall into an unguarded vacuum; the supersede write-back is enforced by spec-dev's executing-plans wrap-up.

Only specs that have frontmatter and `status: active` take part. The default one-page spec has no frontmatter and is not guarded; a `draft` spec does not block either.

At edit time (`--hook`), "already synced" includes existing working-tree changes (staged + unstaged + untracked): **update the spec first, then touch the covered code, and you pass**; dirty files in the working tree do not expand the trigger set, and editing unrelated files is unaffected by pre-existing drift. Explicit `node scripts/spec-dev/check-spec-drift.mjs --worktree` audits the whole working tree and still exits 2 on drift. The installed Stop uses `--worktree --warn-only`, returning a visible advisory with exit 0; pre-existing edits therefore do not block a read-only answer. Shell writes missed by PreToolUse may only be blocked at explicit delivery audit or commit time.

After updating the plugin, rerun `node guardrail/install.mjs --repo <target>` to refresh installed copies. The installer replaces its exact legacy blocking Stop command with the advisory command, preserving custom hooks and settings. Business-project pre-push remains installed; only consider removing it when protected branches require the range-check CI job.

## While a plan is being implemented

Implementing or revising a guarded spec through a plan needs no per-commit waiver:

- The spec stays `draft` on the feature branch during implementation. The guard only looks at `active` specs, so task commits pass.
- When revising a spec that is already `active`, the first commit on the feature branch returns it to `draft`; a fully replaced spec is set to `superseded` with `superseded_by` in that same commit.
- The delivery commit turns the spec `active`, and later changes are guarded again.

These status changes live only on the feature branch; the main branch stays as it was until the merge. When a task commit touches code owned by another feature's active spec, the guard still blocks it: sync that spec if behavior changed, or use the temporary bypass below if it did not.

Commits that task binding stamped with a `Spec-Task` trailer in the past pass range checks with a notice and are no longer verified. Rerunning the installer after updating the plugin removes the guard blocks it once added to `prepare-commit-msg` and `commit-msg`, and the `task-binding` script copies; hook content you wrote stays untouched.

## Temporary bypass

- Recommended: leave a `Spec-Guard: off <reason>` trailer in the commit message — the range checks in pre-push and CI recognize it and let the commit through (printing a count for human review), consistent across the chain.
- One-off command: `SPEC_DEV_GUARD=off git commit …` (warns then passes; leaving the trailer as well is recommended, otherwise push/CI range checks still block).
- Pure-documentation features need no guard: leave `covers` as `[]`.

## Superseding

`superseded` is a lifecycle terminal state, not a bypass: mark a spec superseded only together with `superseded_by` pointing to its successor spec (repo-root-relative path) in the same change, and the successor's covers must take over the old spec's still-existing paths. When you land on a superseded spec, follow the pointer to the successor — never base new work on it; if a feature is simply deleted, write a lightweight REMOVED-only successor spec to record the reason.

## Files

```
guardrail/
├── check-spec-drift.mjs      # core validator (zero dependencies)
├── lib/                      # installed shared parsers and Git views
├── session-context.mjs       # SessionStart context injection + guard health self-check
├── install.mjs               # installer
└── templates/
    ├── claude-settings.json  # Claude hooks fragment (PreToolUse + Stop + SessionStart)
    ├── codex-hooks.json      # Codex hooks fragment
    ├── pre-commit            # versioned git hook (chains legacy .git/hooks)
    ├── pre-push              # versioned git hook (second gate)
    ├── github-workflow.yml   # CI
    ├── CLAUDE.md.snippet     # Claude soft reminder
    └── AGENTS.md.snippet     # Codex soft reminder
```

## Known limitations

- The guard block injected into an existing custom hooks directory (e.g. husky) captures stdin first, feeds it to the guard, then restores it to the host hook via `exec <<heredoc` — the host script still reads its refs; very old `sh` without heredoc-`exec` support needs manual adjustment. The template hook has no such concern (captures stdin first, then forwards).
- For a new ref without a trustworthy remote boundary, pre-push checks all reachable history. Existing refs are checked separately; synchronization cannot be borrowed across refs.
