#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Scenario: 特性上下文中的产物落位——只验证路径计算（--dry-run 不起服务器）
out=$(bash skills/visual-preview/scripts/start-server.sh --project-dir /tmp/vp-proj \
      --feature-dir /tmp/vp-proj/.spec-dev/2026-08-26-01-demo --dry-run 2>&1)
echo "$out" | grep -q "/tmp/vp-proj/.spec-dev/2026-08-26-01-demo/visual/" || { echo "FAIL: 特性目录未生效"; exit 1; }
# Scenario: 无特性上下文回退
out=$(bash skills/visual-preview/scripts/start-server.sh --project-dir /tmp/vp-proj --dry-run 2>&1)
echo "$out" | grep -q "/tmp/vp-proj/.spec-dev/visual/" || { echo "FAIL: 回退路径不对"; exit 1; }
echo PASS
