#!/usr/bin/env bash
# Tự động pull code mới từ origin và deploy lại stack trên máy này.
# Chạy định kỳ bằng systemd timer (xem deploy/systemd/) hoặc chạy tay.
#
# Biến môi trường:
#   DEPLOY_DIR     thư mục repo dùng để deploy (mặc định: repo chứa script này)
#   DEPLOY_REMOTE  remote để fetch (mặc định: origin)
#   DEPLOY_BRANCH  nhánh được deploy (mặc định: master)
#   DEPLOY_TARGET  compose | k8s (mặc định: compose)
#   DEPLOY_WAIT_TIMEOUT  số giây chờ container healthy với compose (mặc định: 600)
#
# Tuỳ chọn:
#   --force  deploy lại kể cả khi không có commit mới
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
DEPLOY_TARGET="${DEPLOY_TARGET:-compose}"
DEPLOY_WAIT_TIMEOUT="${DEPLOY_WAIT_TIMEOUT:-600}"
FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

log() { echo "[auto-deploy] $*"; }
die() { echo "[auto-deploy] LỖI: $*" >&2; exit 1; }

# Không cho hai lần chạy chồng lên nhau (build có thể lâu hơn chu kỳ timer).
LOCK_FILE="${XDG_RUNTIME_DIR:-/tmp}/instagram-auto-deploy.lock"
exec 9>"$LOCK_FILE"
flock -n 9 || { log "Đang có lần deploy khác chạy, bỏ qua."; exit 0; }

cd "$DEPLOY_DIR"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$current_branch" == "$DEPLOY_BRANCH" ]] \
  || die "$DEPLOY_DIR đang ở nhánh '$current_branch', cần '$DEPLOY_BRANCH'."
[[ -z "$(git status --porcelain --untracked-files=no)" ]] \
  || die "$DEPLOY_DIR có thay đổi chưa commit, không tự pull."

git fetch --quiet "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"
old_sha="$(git rev-parse HEAD)"
new_sha="$(git rev-parse "$DEPLOY_REMOTE/$DEPLOY_BRANCH")"

if [[ "$old_sha" == "$new_sha" && "$FORCE" -eq 0 ]]; then
  exit 0
fi

if [[ "$old_sha" != "$new_sha" ]]; then
  git merge --ff-only --quiet "$DEPLOY_REMOTE/$DEPLOY_BRANCH" \
    || die "Không fast-forward được lên $DEPLOY_REMOTE/$DEPLOY_BRANCH."
  log "Đã pull ${old_sha:0:7} -> ${new_sha:0:7}"

  # Commit chỉ đổi tài liệu thì không cần build lại.
  if [[ "$FORCE" -eq 0 ]] && ! git diff --name-only "$old_sha" "$new_sha" | grep -qvE '\.md$'; then
    log "Chỉ thay đổi tài liệu, bỏ qua deploy."
    exit 0
  fi
fi

log "Deploy ${new_sha:0:7} bằng target '$DEPLOY_TARGET'..."
case "$DEPLOY_TARGET" in
  compose)
    docker compose up --build -d --wait --wait-timeout "$DEPLOY_WAIT_TIMEOUT"
    ;;
  k8s)
    make k8s-redeploy
    ;;
  *)
    die "DEPLOY_TARGET không hợp lệ: '$DEPLOY_TARGET' (compose | k8s)."
    ;;
esac

# Mỗi lần build để lại image cũ không còn tag; dọn để không đầy ổ đĩa.
docker image prune -f >/dev/null

log "Deploy ${new_sha:0:7} thành công."
