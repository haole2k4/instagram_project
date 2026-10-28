#!/usr/bin/env bash
# Mở window tmux cho một worktree (mỗi worktree 1 window, cwd = worktree, pane trái: agent, pane phải: shell).
# Cách dùng:
#   tmux-worktree.sh <đường-dẫn-worktree-hoặc-nhánh> [lệnh-agent]
#   tmux-worktree.sh <loại/mô-tả> <agent> <glob>...   (tự gọi new-worktree.sh nếu chưa tồn tại)
set -euo pipefail
. "$(dirname "$0")/lib.sh"

command -v tmux >/dev/null 2>&1 || { echo "✗ Chưa cài đặt tmux trên máy." >&2; exit 1; }

target="${1:?thiếu <nhánh-hoặc-đường-dẫn-worktree>}"
agent_cmd="${AGENT_CMD:-}"

if [[ -d "$target" ]]; then
  dir="$(cd "$target" && pwd)"
  win="$(basename "$dir")"
  shift
  [[ $# -gt 0 && -z "$agent_cmd" ]] && agent_cmd="$*"
else
  branch="$target"
  win="${branch//\//-}"
  dir="$(dirname "$AGENT_MAIN")/$(basename "$AGENT_MAIN").worktrees/$win"
  if [[ ! -d "$dir" ]]; then
    if [[ $# -ge 3 ]]; then
      "$(dirname "$0")/new-worktree.sh" "$@"
    else
      echo "✗ Worktree chưa tồn tại tại '$dir'. Để tạo mới, truyền đủ: tmux-worktree.sh <loại/mô-tả> <agent> <glob>..." >&2
      exit 2
    fi
  else
    shift
    [[ $# -gt 0 && -z "$agent_cmd" ]] && agent_cmd="$*"
  fi
fi

session="${AGENT_TMUX_SESSION:-$(basename "$AGENT_MAIN")}"

created=0
if ! tmux has-session -t "=$session" 2>/dev/null; then
  tmux new-session -d -s "$session" -n "$win" -c "$dir"
  created=1
elif tmux list-windows -t "=$session" -F '#{window_name}' | grep -qx "$win"; then
  echo "Window tmux '$session:$win' đã tồn tại, giữ nguyên không tạo đè."
else
  tmux new-window -d -t "=$session" -n "$win" -c "$dir"
  created=1
fi

if [[ $created -eq 1 ]]; then
  tmux split-window -h -t "=$session:$win" -c "$dir"
  left_pane="$(tmux list-panes -t "=$session:$win" -F '#{pane_id}' | head -n1)"
  if [[ -n "$agent_cmd" ]]; then
    tmux send-keys -t "$left_pane" "$agent_cmd" C-m
  fi
  tmux select-pane -t "$left_pane"
fi

tmux select-window -t "=$session:$win"
echo "Tmux window: $session:$win (cwd: $dir | pane trái: agent | pane phải: shell)"

if [[ "${AGENT_TMUX_ATTACH:-0}" == 1 ]]; then
  if [[ -n "${TMUX:-}" ]]; then
    tmux switch-client -t "=$session:$win"
  else
    tmux attach-session -t "=$session:$win"
  fi
fi
