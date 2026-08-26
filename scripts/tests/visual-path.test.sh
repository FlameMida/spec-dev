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
# Scenario: 相对路径 --feature-dir 被绝对化（脚本内部会 cd 到自身目录，相对路径必须先锚定调用方 cwd）
mkdir -p /tmp/vp-rel/.spec-dev/2026-08-26-01-demo
out=$(cd /tmp/vp-rel && bash /Users/maverick/feature-dev/.worktrees/plan-2026-08-26-01-major-upgrade/skills/visual-preview/scripts/start-server.sh \
      --feature-dir .spec-dev/2026-08-26-01-demo --dry-run 2>&1)
echo "$out" | grep -q "SESSION_DIR=/tmp/vp-rel/.spec-dev/2026-08-26-01-demo/visual/" || { echo "FAIL: 相对 feature-dir 未绝对化, got: $out"; exit 1; }
# Scenario: 只传 --feature-dir（无 --project-dir）时端口/密钥记忆文件锚定在 .spec-dev/visual 根，而非文件系统根
echo "$out" | grep -q "PORT_FILE=/tmp/vp-rel/.spec-dev/visual/.last-port" || { echo "FAIL: port 记忆文件路径悬空, got: $out"; exit 1; }
rm -rf /tmp/vp-rel
echo PASS
