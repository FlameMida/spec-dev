# Acceptance Report: {{target-feature}}

> **Language / 语言**: Fill report content in the conversation language; keep table headers and structural labels in English. / 报告内容以对话语言填写；表头与结构标签保持英文。
> Time: {{time}} | Triggered by: {{executing-plans wrap-up / direct user request}} | Tier: {{light/standard/deep}}
> Spec: {{spec path or "none (mini matrix)"}} | Evidence dir: {{acceptance/ path}}

## Overview

| Dimension | Execution | Pass | Fail | Warn | Unverified | Notes |
|-----------|-----------|------|------|------|------------|-------|
| unit | D | 42 | 0 | 0 | 0 | full run 3.2s |
| integration | D | 11 | 1 | 0 | 0 | 1 failure → Diagnosis #1 |
| e2e | D + A | 6 | 0 | 1 | 0 | warning → Finding #2 |
| visual | D | 4 | 0 | 0 | 1 | 1 item without baseline (created) |
| a11y | D | 1 | 0 | 0 | 0 | no WCAG A/AA violations |
| perf-web | D | 2 | 0 | 0 | 0 | LCP median 1.8s ≤ 2.5s |
| perf-api | D | — | — | — | 1 | k6 not installed (see coverage_note) |

## Requirement Coverage (when a spec exists)

| Matrix row (Scenario / check item) | Dimension | Status | Evidence |
|------------------------------------|-----------|--------|----------|
| {{reject-expired-token}} | integration | pass | {{tests/auth.spec.ts passed}} |
| {{login-redirects-to-dashboard}} | e2e | pass | {{e2e passed + trace.zip}} |

## Key Findings (by severity)

1. **[P1] {{title}}** ({{dimension}}, Diagnosis #1) — {{one-line impact}}; root cause: {{file:line + verified root cause}}; suggestion: {{fix direction}}
2. **[P3] {{title}}** ({{dimension}}) — {{impact and suggestion}}

## Diagnosis Details

{{One section per failure, format per references/diagnose.md Step 4; write "all passed, diagnosis skipped" when nothing failed}}

## Evidence Index

- Contract JSON: `{{acceptance/check-items.json}}` (validated by validate-output.mjs)
- Test files: {{list of tests generated/run this round}}
- Screenshots / traces / perf reports: {{file list}}

## coverage_note

{{Trimmed dimensions and reasons; unverified items and why; tier-down/sampling statements. Write "full matrix executed, no truncation" when nothing was cut}}
