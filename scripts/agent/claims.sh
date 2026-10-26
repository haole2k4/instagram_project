#!/usr/bin/env bash
# Bảng claims: mỗi dòng "agent | branch | glob". File: <git-common-dir>/agent-claims.txt
#   claims.sh list
#   claims.sh add <agent> <glob>...   (branch = branch hiện tại; trùng claim của branch khác -> lỗi)
#   claims.sh rm                      (xoá mọi claim của branch hiện tại)
set -euo pipefail
. "$(dirname "$0")/lib.sh"

touch "$AGENT_CLAIMS"
branch="${AGENT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
cmd="${1:-list}"; shift || true

case "$cmd" in
  list) cat "$AGENT_CLAIMS" ;;
  add)
    agent="${1:?thiếu <agent>}"; shift
    [[ $# -gt 0 ]] || { echo "thiếu <glob>" >&2; exit 2; }
    (
      flock 9
      rc=0
      for g in "$@"; do
        while IFS='|' read -r _ b p; do
          b="$(echo "$b" | xargs)"; p="$(echo "$p" | xargs)"
          [[ -z "$b" || "$b" == "$branch" ]] && continue
          if globs_overlap "$g" "$p"; then
            echo "TRÙNG CLAIM: '$g' đụng '$p' (branch $b). Dừng phần này, ghi lại xung đột, chuyển việc khác." >&2
            rc=1
          fi
        done < "$AGENT_CLAIMS"
      done
      [[ $rc -eq 0 ]] || exit 1
      for g in "$@"; do echo "$agent | $branch | $g" >> "$AGENT_CLAIMS"; done
    ) 9>"$AGENT_CLAIMS.lock"
    ;;
  rm)
    (
      flock 9
      grep -v "| $branch |" "$AGENT_CLAIMS" > "$AGENT_CLAIMS.tmp" || true
      mv "$AGENT_CLAIMS.tmp" "$AGENT_CLAIMS"
    ) 9>"$AGENT_CLAIMS.lock"
    ;;
  *) echo "dùng: claims.sh list|add|rm" >&2; exit 2 ;;
esac
