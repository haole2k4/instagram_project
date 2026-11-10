#!/usr/bin/env bash
# Tự động pull code mới từ origin và deploy lại stack trên máy này.
# Chạy định kỳ bằng systemd timer (xem deploy/systemd/) hoặc chạy tay.
#
# Biến môi trường:
#   DEPLOY_DIR            thư mục repo dùng để deploy (mặc định: repo chứa script này)
#   DEPLOY_REMOTE         remote để fetch (mặc định: origin)
#   DEPLOY_BRANCH         nhánh được deploy (mặc định: master)
#   DEPLOY_TARGET         compose | k8s (mặc định: compose)
#   DEPLOY_WAIT_TIMEOUT   số giây chờ container healthy với compose (mặc định: 600)
#   DEPLOY_REQUIRE_CI     1 (mặc định) yêu cầu check-run CI trên GitHub phải pass trước khi pull/deploy; 0 để tắt kiểm tra
#   DEPLOY_CI_CHECK_NAME  tên check-run cần pass (mặc định: CI OK)
#
# Tuỳ chọn:
#   --force  deploy lại kể cả khi không có commit mới và bỏ qua kiểm tra CI
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
DEPLOY_TARGET="${DEPLOY_TARGET:-compose}"
DEPLOY_WAIT_TIMEOUT="${DEPLOY_WAIT_TIMEOUT:-600}"
DEPLOY_REQUIRE_CI="${DEPLOY_REQUIRE_CI:-1}"
DEPLOY_CI_CHECK_NAME="${DEPLOY_CI_CHECK_NAME:-CI OK}"
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

# Commit chỉ đổi tài liệu hoặc cấu hình GitHub thì không cần chờ CI và không cần deploy lại.
if [[ "$old_sha" != "$new_sha" && "$FORCE" -eq 0 ]] && ! git diff --name-only "$old_sha" "$new_sha" | grep -qvE '^(\.github/|.*\.md$)'; then
  git merge --ff-only --quiet "$DEPLOY_REMOTE/$DEPLOY_BRANCH" \
    || die "Không fast-forward được lên $DEPLOY_REMOTE/$DEPLOY_BRANCH."
  log "Đã pull ${old_sha:0:7} -> ${new_sha:0:7} (chỉ thay đổi tài liệu hoặc cấu hình GitHub, bỏ qua deploy)."
  exit 0
fi

# Cổng kiểm tra CI: đảm bảo commit mới đã pass CI trên GitHub Actions trước khi pull và deploy.
case "$DEPLOY_REQUIRE_CI" in
  0|1) ;;
  *) die "DEPLOY_REQUIRE_CI không hợp lệ: '$DEPLOY_REQUIRE_CI' (0 | 1)." ;;
esac

if [[ "$DEPLOY_REQUIRE_CI" -eq 1 && "$FORCE" -eq 0 ]]; then
  command -v gh >/dev/null 2>&1 \
    || die "Thiếu 'gh' (GitHub CLI) để kiểm tra CI. Hãy cài gh và cấu hình GH_TOKEN (fine-grained PAT quyền read-only Checks) trong ~/.config/instagram-auto-deploy.env, hoặc đặt DEPLOY_REQUIRE_CI=0 để tắt kiểm tra."

  if [[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" ]] && ! gh auth status >/dev/null 2>&1; then
    die "Chưa xác thực GitHub CLI. Hãy đặt GH_TOKEN=<token> (fine-grained PAT quyền read-only Checks cho haole2k4/instagram_project) trong ~/.config/instagram-auto-deploy.env."
  fi

  ci_state="$(gh api "repos/haole2k4/instagram_project/commits/$new_sha/check-runs" \
    --jq "([.check_runs[] | select(.name == \"$DEPLOY_CI_CHECK_NAME\")] | last) as \$r | if \$r == null then \"missing\" elif \$r.status != \"completed\" then \"pending:\\(\$r.status)\" else \"completed:\\(\$r.conclusion // \"unknown\")\" end")" \
    || die "Không gọi được GitHub API kiểm tra check-run cho ${new_sha:0:7}. Kiểm tra mạng hoặc quyền của GH_TOKEN."

  STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/instagram-auto-deploy"
  REJECTED_SHA_FILE="$STATE_DIR/rejected-sha"

  case "$ci_state" in
    completed:success)
      if [[ -f "$REJECTED_SHA_FILE" && "$(cat "$REJECTED_SHA_FILE" 2>/dev/null || true)" == "$new_sha" ]]; then
        rm -f "$REJECTED_SHA_FILE"
      fi
      log "Check '$DEPLOY_CI_CHECK_NAME' cho ${new_sha:0:7} đã pass (success)."
      ;;
    missing|pending:*)
      if [[ -f "$REJECTED_SHA_FILE" && "$(cat "$REJECTED_SHA_FILE" 2>/dev/null || true)" == "$new_sha" ]]; then
        rm -f "$REJECTED_SHA_FILE"
      fi
      if [[ "$ci_state" == "missing" ]]; then
        log "Check '$DEPLOY_CI_CHECK_NAME' cho ${new_sha:0:7} chưa xuất hiện trên GitHub Actions. Sẽ thử lại ở lần chạy tiếp theo."
      else
        log "Check '$DEPLOY_CI_CHECK_NAME' cho ${new_sha:0:7} đang chạy (${ci_state#pending:}). Sẽ thử lại ở lần chạy tiếp theo."
      fi
      exit 0
      ;;
    completed:*)
      conclusion="${ci_state#completed:}"
      if [[ -f "$REJECTED_SHA_FILE" && "$(cat "$REJECTED_SHA_FILE" 2>/dev/null || true)" == "$new_sha" ]]; then
        exit 0
      fi
      mkdir -p "$STATE_DIR"
      printf '%s\n' "$new_sha" > "$REJECTED_SHA_FILE"
      log "BỎ QUA DEPLOY ${new_sha:0:7}: check '$DEPLOY_CI_CHECK_NAME' kết thúc với trạng thái '$conclusion'."
      exit 0
      ;;
    *)
      die "Trạng thái CI không mong đợi: '$ci_state'."
      ;;
  esac
fi

if [[ "$old_sha" != "$new_sha" ]]; then
  git merge --ff-only --quiet "$DEPLOY_REMOTE/$DEPLOY_BRANCH" \
    || die "Không fast-forward được lên $DEPLOY_REMOTE/$DEPLOY_BRANCH."
  log "Đã pull ${old_sha:0:7} -> ${new_sha:0:7}"
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
