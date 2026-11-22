#!/usr/bin/env bash
# Hàm dùng chung cho scripts/agent/* và scripts/githooks/*.

AGENT_ROOT="$(git rev-parse --show-toplevel)"
AGENT_GIT_DIR="$(cd "$(git rev-parse --git-dir)" && pwd)"
AGENT_COMMON="$(cd "$(git rev-parse --git-common-dir)" && pwd)"
AGENT_MAIN="$(dirname "$AGENT_COMMON")"
# Một bản duy nhất cho mọi worktree, nằm trong .git nên không đi theo branch, không bị commit.
AGENT_CLAIMS="$AGENT_COMMON/agent-claims.txt"

# is_main_checkout: đúng nếu đang đứng ở checkout chính (git-dir == git-common-dir).
is_main_checkout() {
  [[ "$AGENT_GIT_DIR" == "$AGENT_COMMON" ]]
}

# match_glob <đường dẫn> <glob>: '*' khớp cả '/'. Glob kết thúc bằng '/' = cả thư mục.
match_glob() {
  local f="$1" g="$2"
  [[ "$g" == */ ]] && g="${g}*"
  [[ "$f" == $g ]]
}

# is_shared <đường dẫn>
is_shared() {
  local f="$1" g
  while IFS= read -r g; do
    [[ -z "$g" || "$g" == \#* ]] && continue
    match_glob "$f" "$g" && return 0
  done < "$AGENT_ROOT/scripts/agent/shared-paths.txt"
  return 1
}

# is_env_file <đường dẫn>: .env, .env.local... (trừ *.example)
is_env_file() {
  local b="${1##*/}"
  [[ "$b" == .env || ( "$b" == .env.* && "$b" != *.example ) ]]
}

# prefix_of <glob>: phần cố định phía trước ký tự '*'.
prefix_of() { local g="$1"; echo "${g%%\**}"; }

# globs_overlap <a> <b>: đúng nếu hai glob có thể giao nhau.
# Khi một bên có wildcard ở đầu (prefix rỗng như '**/*Story*'), chỉ coi là trùng
# khi giống hệt hoặc một bên khớp trực tiếp với pattern của bên kia.
globs_overlap() {
  local g1="$1" g2="$2" a b
  [[ "$g1" == "$g2" ]] && return 0
  a="$(prefix_of "$g1")"; b="$(prefix_of "$g2")"
  if [[ -z "$a" || -z "$b" ]]; then
    local p1="$g1" p2="$g2"
    [[ "$p1" == */ ]] && p1="${p1}*"
    [[ "$p2" == */ ]] && p2="${p2}*"
    [[ "$g2" == $p1 || "$g1" == $p2 ]]
    return $?
  fi
  [[ "$a" == "$b"* || "$b" == "$a"* ]]
}
