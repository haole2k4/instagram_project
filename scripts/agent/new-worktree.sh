#!/usr/bin/env bash
# Tạo worktree + branch từ origin/master, ghi .agent-scope, thêm claim, bật hook, symlink .env và cài node_modules.
#   new-worktree.sh <loại/mô-tả> <agent> <glob>...
# Ví dụ: new-worktree.sh feature/admin-reports agent-a 'Social-app-fontend/src/Admin/*'
set -euo pipefail
. "$(dirname "$0")/lib.sh"

branch="${1:?thiếu <loại/mô-tả>}"; agent="${2:?thiếu <agent>}"; shift 2
[[ $# -gt 0 ]] || { echo "✗ Thiếu <glob> vùng được sửa." >&2; exit 2; }
[[ "$branch" =~ ^(feature|fix|docs|chore|refactor|test)/[a-z0-9-]+$ ]] \
  || { echo "✗ Tên branch phải dạng <loại>/<kebab-case> (feature|fix|docs|chore|refactor|test)." >&2; exit 2; }

dir="$(dirname "$AGENT_MAIN")/$(basename "$AGENT_MAIN").worktrees/${branch//\//-}"
[[ ! -e "$dir" ]] || { echo "✗ Thư mục worktree đã tồn tại: $dir" >&2; exit 1; }

base="${AGENT_BASE:-origin/master}"; [[ -n "${AGENT_BASE:-}" ]] || git fetch origin master

if git show-ref --verify --quiet "refs/heads/$branch" || git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  echo "✗ Nhánh '$branch' đã tồn tại (không dùng lại nhánh cũ hoặc đã merge). Hãy tạo nhánh mới." >&2
  exit 1
fi

AGENT_BRANCH="$branch" "$AGENT_ROOT/scripts/agent/claims.sh" add "$agent" "$@"
if ! git worktree add -b "$branch" "$dir" "$base"; then
  AGENT_BRANCH="$branch" "$AGENT_ROOT/scripts/agent/claims.sh" rm || true
  exit 1
fi

printf '%s\n' "$@" > "$dir/.agent-scope"
grep -qx '.agent-scope' "$AGENT_COMMON/info/exclude" 2>/dev/null || echo '.agent-scope' >> "$AGENT_COMMON/info/exclude"
git config core.hooksPath scripts/githooks

for env_rel in .env Social-app-fontend/.env backend_instagram/.env; do
  if [[ -f "$AGENT_MAIN/$env_rel" && ! -e "$dir/$env_rel" ]]; then
    ln -s "$AGENT_MAIN/$env_rel" "$dir/$env_rel"
    echo "Đã symlink $env_rel -> $AGENT_MAIN/$env_rel"
  fi
done

if [[ "${AGENT_SKIP_INSTALL:-0}" != 1 && -f "$dir/Social-app-fontend/pnpm-lock.yaml" ]]; then
  if ! command -v pnpm >/dev/null 2>&1 && [[ -d "$HOME/.nvm/versions/node" ]]; then
    nvm_bin="$(find "$HOME/.nvm/versions/node" -maxdepth 2 -type d -name bin 2>/dev/null | sort -V | tail -n1 || true)"
    [[ -n "$nvm_bin" ]] && export PATH="$nvm_bin:$PATH"
  fi
  if command -v pnpm >/dev/null 2>&1; then
    echo "Đang cài node_modules cho Social-app-fontend (--frozen-lockfile)..."
    (cd "$dir/Social-app-fontend" && pnpm install --frozen-lockfile --prefer-offline)
  else
    echo "⚠ Không tìm thấy pnpm trong PATH; bỏ qua cài đặt tự động node_modules." >&2
  fi
fi

echo "Worktree: $dir"
echo "Vùng được sửa: $*"
