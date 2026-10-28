#!/usr/bin/env bash
# Kiểm tra file staged. Gọi từ scripts/githooks/pre-commit.
# Luôn chặn: commit ở checkout chính, file .env, commit trực tiếp lên master.
# Worktree có .agent-scope: file phải nằm trong scope, không đụng shared (trừ AGENT_ALLOW_SHARED=1
# và commit chỉ chứa shared), không đụng vùng claim của branch khác.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

branch="$(git rev-parse --abbrev-ref HEAD)"
fail=0
err() { echo "✗ $*" >&2; fail=1; }

is_main_checkout && err "Không commit trực tiếp ở checkout chính ($AGENT_MAIN). Hãy tạo worktree riêng bằng scripts/agent/new-worktree.sh."
[[ "$branch" == master ]] && err "Không commit trực tiếp lên master. Tạo branch riêng."

mapfile -t files < <(git diff --cached --name-only --no-renames)
shared=(); other=()
for f in "${files[@]}"; do
  is_env_file "$f" && err "$f: không commit file .env."
  if is_shared "$f"; then shared+=("$f"); else other+=("$f"); fi
done

scope_file="$AGENT_ROOT/.agent-scope"
if [[ -f "$scope_file" ]]; then
  mapfile -t scope < <(grep -vE '^\s*(#|$)' "$scope_file")

  if [[ ${#shared[@]} -gt 0 ]]; then
    if [[ "${AGENT_ALLOW_SHARED:-}" != 1 ]]; then
      err "Chạm file shared (đề xuất vào báo cáo thay vì sửa; nếu bắt buộc: AGENT_ALLOW_SHARED=1 + commit riêng + message 'shared: ...'):"
      printf '    %s\n' "${shared[@]}" >&2
    elif [[ ${#other[@]} -gt 0 ]]; then
      err "Commit shared phải riêng, không lẫn file thường:"
      printf '    %s\n' "${other[@]}" >&2
    fi
  fi

  for f in "${other[@]}"; do
    ok=0
    for g in "${scope[@]}"; do match_glob "$f" "$g" && { ok=1; break; }; done
    [[ $ok -eq 1 ]] || err "$f: ngoài vùng được giao (.agent-scope)."
  done

  if [[ -f "$AGENT_CLAIMS" ]]; then
    while IFS='|' read -r _ b p; do
      b="$(echo "$b" | xargs)"; p="$(echo "$p" | xargs)"
      [[ -z "$b" || "$b" == "$branch" ]] && continue
      for f in "${files[@]}"; do
        match_glob "$f" "$p" && err "$f: đang bị branch '$b' giữ ($p)."
      done
    done < "$AGENT_CLAIMS"
  fi
fi

exit $fail
