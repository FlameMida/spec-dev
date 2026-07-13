# spec-dev Drift Guard (guardrail)

English | [简体中文](README.zh-CN.md)

Stops documentation drift caused by "a successor skips the spec-dev workflow and changes code without syncing the spec". Layered defenses: tool-agnostic hard blocking + Claude/Codex tool-surface interception + soft reminders.

## One-command install into a target repo

```bash
node guardrail/install.mjs [--repo <path>] [--no-git-hook] [--no-ci]
```

Installs into the current git repository by default; idempotent and safe to re-run.

> **Running the installer inside the Codex sandbox**: the Codex workspace-write sandbox forces git config and `.codex/` read-only (anti-privilege-escalation), so the `core.hooksPath` config and `.codex/hooks.json` fail to write inside the sandbox. Run the installer outside the sandbox (user terminal); defenses that do install inside the sandbox still work, and the versioned `.githooks/` files land normally.

## Defense layers

| Layer | Mechanism | Scope | Bypassable |
|---|---|---|---|
| Edit-time interception · Claude | `.claude/settings.json` PreToolUse hook (exit code 2 blocks); passes once the spec is already synced in the working tree | Claude Code sessions | Switch tools to bypass |
| Wrap-up audit · Claude | Stop hook runs a drift check over the whole working tree — shell writes (`sed -i`, `cat >`, etc.) can't escape it; blocks once per turn | Claude Code sessions | Switch tools to bypass |
| Edit-time interception · Codex | `.codex/hooks.json` PreToolUse hook (exit code 2 blocks) | Codex sessions | Switch tools to bypass |
| Commit-time interception | Versioned `.githooks/pre-commit` (enabled via `core.hooksPath`; the package.json `prepare` script auto-configures it on install, so fresh clones carry the gate) | All local commits, any editing tool | `--no-verify` bypasses |
| Push-time interception | Versioned `.githooks/pre-push` re-checks the whole range to be pushed, catching commits that slipped through `--no-verify` | All local pushes | `--no-verify` bypasses |
| **Last line** | `.github/workflows/spec-dev-drift-guard.yml` | **All pushes/PRs, tool-agnostic** | **Not bypassable** |
| Session self-heal | SessionStart hook → `session-context.mjs`: injects workflow obligations + guard health self-check (when it finds e.g. `core.hooksPath` disabled, it asks the in-session agent to fix it on the spot) | Claude / Codex sessions | Advisory only |
| Soft reminder | Guard sections in `CLAUDE.md` / `AGENTS.md` | Each AI tool | Advisory only |

The single source of truth is `check-spec-drift.mjs`; every defense calls it, just with different input modes (`--staged` / `--range` / `--push` / `--hook` / `--worktree`).

## Detection logic

Each spec's frontmatter `spec_dev.covers` (glob) declares the code it owns. A batch of changes that hits the `covers` of a `status: active` spec without also touching that spec is judged as drift.

The frontmatter `sync_commit` is the delivery anchor: the commit where code and this spec were last confirmed in sync — written by the executing-plans wrap-up after merge; `git diff <sync_commit>..HEAD -- <covers>` shows code drift since. The guard parses this field but it plays no part in blocking decisions.

At edit time (`--hook`), "already synced" includes existing working-tree changes (staged + unstaged + untracked): **update the spec first, then touch the covered code, and you pass**; dirty files in the working tree do not expand the trigger set, and editing unrelated files is unaffected by pre-existing drift. The wrap-up audit (`--worktree`) uses the whole working tree as the change set, backstopping files written by tools that bypassed the tool surface within the turn.

## Temporary bypass

- Recommended: leave a `Spec-Guard: off <reason>` trailer in the commit message — the range checks in pre-push and CI recognize it and let the commit through (printing a count for human review), consistent across the chain.
- One-off command: `SPEC_DEV_GUARD=off git commit …` (warns then passes; leaving the trailer as well is recommended, otherwise push/CI range checks still block).
- Obsolete spec: set its frontmatter `status` to `superseded`.
- Pure-documentation features need no guard: leave `covers` as `[]`.

## Files

```
guardrail/
├── check-spec-drift.mjs      # core validator (zero dependencies)
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

- The pre-push guard line appended into an existing custom hooks directory (e.g. husky) relies on stdin not being consumed by earlier scripts; the template hook has no such issue (captures stdin first, then forwards).
- pre-push lets refs pass (fail-open) for "first push of a new branch where the origin default branch can't be resolved" — CI backstops those.
