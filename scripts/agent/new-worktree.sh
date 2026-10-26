#!/usr/bin/env bash
# Tạo worktree + branch từ origin/master, ghi .agent-scope, thêm claim, bật hook.
#   new-worktree.sh <loại/mô-tả> <agent> <glob>...
# Ví dụ: new-worktree.sh feature/admin-reports agent-a 'Social-app-fontend/src/Admin/*'
set -euo pipefail
. "$(dirname "$0")/lib.sh"

branch="${1:?thiếu <loại/mô-tả>}"; agent="${2:?thiếu <agent>}"; shift 2
[[ $# -gt 0 ]] || { echo "thiếu <glob> vùng được sửa" >&2; exit 2; }
[[ "$branch" =~ ^(feature|fix|docs|chore|refactor|test)/[a-z0-9-]+$ ]] \
  || { echo "tên branch phải dạng <loại>/<kebab-case>" >&2; exit 2; }

dir="$(dirname "$AGENT_ROOT")/$(basename "$AGENT_ROOT").worktrees/${branch//\//-}"

base="${AGENT_BASE:-origin/master}"; [[ -n "${AGENT_BASE:-}" ]] || git fetch origin master
AGENT_BRANCH="$branch" "$AGENT_ROOT/scripts/agent/claims.sh" add "$agent" "$@"
git worktree add -b "$branch" "$dir" "$base"
printf '%s\n' "$@" > "$dir/.agent-scope"
grep -qx '.agent-scope' "$AGENT_COMMON/info/exclude" 2>/dev/null || echo '.agent-scope' >> "$AGENT_COMMON/info/exclude"
git config core.hooksPath scripts/githooks
echo "Worktree: $dir"
echo "Vùng được sửa: $*"
