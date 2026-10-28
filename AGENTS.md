# AGENTS.md

Quy tắc làm việc cho AI agent (và người) trong repo `haole2k4/instagram_project`.

## Quy tắc bắt buộc trước khi sửa file (Mỗi việc = 1 worktree + 1 nhánh + 1 window tmux)

- **Mọi tác vụ có sửa file đều phải chạy trong một worktree riêng**, không có ngoại lệ (áp dụng cả khi chỉ có một agent chạy một mình lẫn khi nhiều agent chạy song song).
- **Kiểm tra `pwd` ngay trước khi sửa file**: nếu đang đứng ở checkout chính (`git rev-parse --git-dir` trùng `git rev-parse --git-common-dir`), **phải dừng lại ngay và tạo worktree mới trước** bằng `scripts/agent/new-worktree.sh` hoặc `scripts/agent/tmux-worktree.sh`. Hook `pre-commit` chặn mọi commit từ checkout chính.
- **Nhánh làm việc phải khác `master` và chưa từng được merge vào `master`**. Không dùng lại nhánh đã merge; mỗi công việc tạo một nhánh mới từ `origin/master` mới nhất.
- Bật git hooks ngay sau khi clone bằng `make hooks` (đặt `core.hooksPath=scripts/githooks`).

## Bối cảnh repo

- Đây là **fork** của `doanhdai/instagram_project` (upstream). Repo làm việc chính là `haole2k4/instagram_project`.
- Nhánh mặc định: `master`.
- Cấu trúc:
  - `backend_instagram/`: Spring Boot 4.1 (Java 25, Maven wrapper `./mvnw`), MySQL, Redis cache, S3 (LocalStack), WebSocket/STOMP.
  - `Social-app-fontend/`: React 19 (react-app-rewired, pnpm), Tailwind.
  - `k8s/`: manifest kind + ingress-nginx. `docker-compose.yml`, `Makefile`, `localstack-init/` ở thư mục gốc.

## Quy trình Git (bắt buộc)

1. **Không commit trực tiếp lên `master` hoặc ở checkout chính.** Mọi thay đổi, kể cả sửa nhỏ hoặc chỉ sửa tài liệu, đều làm trên một worktree và nhánh mới tạo từ `origin/master` mới nhất.
2. Đặt tên nhánh theo dạng `<loại>/<mô-tả-ngắn-kebab-case>`, ví dụ `feature/redis-kubernetes`, `fix/login-cookie`, `docs/add-agents-md`. Loại thường dùng: `feature`, `fix`, `docs`, `chore`, `refactor`, `test`.
3. Khi push nhánh, **tạo Pull Request trên chính repo này**:
   - base: `haole2k4/instagram_project` nhánh `master`
   - head: nhánh vừa push của `haole2k4/instagram_project`
4. **Tuyệt đối không tạo PR sang `doanhdai/instagram_project`** (repo gốc), kể cả khi giao diện GitHub hoặc công cụ mặc định đề xuất repo đó. Nếu dùng `gh`, luôn chỉ rõ repo đích:
   ```bash
   gh pr create --repo haole2k4/instagram_project --base master --head <nhánh>
   ```
   Nếu dùng REST API: `POST /repos/haole2k4/instagram_project/pulls`.
5. Không `push --force` lên `master`.
6. Mỗi PR tập trung vào một mục đích, mô tả rõ thay đổi gì và cách kiểm tra.
7. Chỉ merge PR (trên repo này) khi build/test liên quan đã pass; nếu chưa chạy được test hoặc test fail thì để PR mở và báo lại.
8. **Bắt buộc xoá nhánh và worktree sau khi merge PR.** Ngay sau khi PR được merge, xoá claim, worktree, nhánh remote/local và đóng window tmux:
   ```bash
   gh pr merge <số-PR> --repo haole2k4/instagram_project --merge --delete-branch
   ./scripts/agent/claims.sh rm
   git worktree remove ../instagram_project.worktrees/<loại>-<mô-tả>
   git branch -d <nhánh>   # hoặc `-D` nếu nhánh chưa được merge fast-forward
   git fetch --prune
   ```
   Không để lại nhánh hoặc worktree đã merge. Nếu merge qua giao diện GitHub, nhớ xoá ở cả hai nơi sau đó.

## Repo gốc (upstream)

- Không đụng tới `doanhdai/instagram_project`: không fetch, merge, rebase từ đó, không push hay tạo PR sang đó. Chỉ làm việc với `haole2k4/instagram_project`.
- Mọi thao tác push (nhánh và tag) chỉ dùng remote `origin` (`git@github.com:haole2k4/instagram_project.git`). Không bao giờ push bằng `upstream`.
- Remote `upstream` đã bị vô hiệu hoá push (`git remote set-url --push upstream no_push`); không khôi phục URL push của nó. Nếu vô tình push sang `doanhdai`, báo lại ngay để xử lý.

## Bảo mật và cấu hình

- Không commit secret: `.env`, mật khẩu, API key (`GEMINI_API_KEY`, `JWT_BASE64_SECRET`, key AWS), `k8s/secret.yaml`. Chỉ cập nhật các file mẫu (`.env.example`, `k8s/secret.example.yaml`).
- Không sửa và không commit mọi file `.env`, kể cả `Social-app-fontend/.env` (đã gỡ khỏi git, chỉ còn tồn tại local và bị `.gitignore` chặn). Cần đổi biến môi trường thì cập nhật file mẫu và báo lại.
- Không in giá trị secret ra log, PR hoặc tin nhắn.
- Biến môi trường mới phải được thêm vào `.env.example` / `docker-compose.yml` / `k8s/configmap.yaml` khi liên quan.

## Phát triển và kiểm tra

- Backend: chạy test trong `backend_instagram/` bằng `./mvnw test` trước khi tạo PR khi có đổi code backend.
- Test messaging (`Notification*`, `RabbitMessaging*`) dùng Testcontainers MySQL + RabbitMQ, cần Docker đang chạy. Khi chỉ sửa phần messaging, chạy targeted trước:
  ```bash
  cd backend_instagram
  ./mvnw -Dtest=NotificationConsumerTest,NotificationEventPublisherTest,NotificationMessagingIntegrationTest,NotificationRetryDlqTest,RabbitMessagingFoundationTest,NotificationServiceTest test
  ```
  Trước khi tạo PR vẫn chạy toàn bộ `./mvnw test`.
- Frontend: trong `Social-app-fontend/` dùng `pnpm` (có `pnpm-lock.yaml`); kiểm tra bằng `pnpm build` (và `pnpm test` nếu có test liên quan).
- Chạy stack: `docker compose up --build -d` hoặc `make k8s-up` (xem `README.md`).
- Đổi hành vi cache Redis, schema DB hoặc manifest `k8s/` thì cập nhật `README.md` tương ứng.

## Phong cách làm việc

- Đọc code liên quan trước khi sửa; theo convention hiện có (package `controller`/`service`/`repository`/`entity`/`dto` ở backend, cấu trúc `Pages`/`Components` ở frontend).
- Trước khi thiết kế hoặc sửa UI, đọc `ART_DIRECTION.md` ở thư mục gốc và giữ đúng hướng thẩm mỹ đã chốt (palette, typography, layout, motion, anti-pattern).
- Sửa tối thiểu, đúng phạm vi yêu cầu; không refactor hoặc format lại file không liên quan.
- Commit message và mô tả PR ngắn gọn, rõ ý; không ràng buộc định dạng hay ngôn ngữ.

## Quy trình Worktree + Tmux

Áp dụng bắt buộc cho mọi công việc sửa file. Cơ chế: [scripts/agent/](scripts/agent/) và [scripts/githooks/](scripts/githooks/). Hook chạy khi `core.hooksPath=scripts/githooks` (bật bằng `make hooks` hoặc khi chạy script tạo worktree).

### Khởi tạo một việc mới
- Tạo worktree kèm window tmux (khuyên dùng):
  ```bash
  ./scripts/agent/tmux-worktree.sh <loại/mô-tả> <agent> '<glob>'...
  ```
  Hoặc tạo worktree trước rồi mở tmux sau:
  ```bash
  ./scripts/agent/new-worktree.sh <loại/mô-tả> <agent> '<glob>'...
  ./scripts/agent/tmux-worktree.sh <loại/mô-tả> [lệnh-agent]
  ```
  Không dùng `git worktree add` tay.
- Script tạo worktree ở `../instagram_project.worktrees/<loại>-<mô-tả>`, branch từ `origin/master`, tự symlink `.env` từ checkout chính và cài `Social-app-fontend/node_modules` bằng `pnpm install --frozen-lockfile --prefer-offline` (có thể đặt `AGENT_SKIP_INSTALL=1` để bỏ qua khi chỉ sửa backend).
- Mỗi worktree có một window tmux riêng (tên `<loại>-<mô-tả>` trong session `instagram_project`), `cwd` đặt tại worktree, **pane trái chạy agent**, **pane phải là shell**.
- Phím tmux cơ bản:
  - `Ctrl-b n` / `Ctrl-b p` / `Ctrl-b <số>`: chuyển giữa các window công việc.
  - `Ctrl-b ←` / `Ctrl-b →` (hoặc `Ctrl-b o`): chuyển giữa pane trái (agent) và pane phải (shell).
  - `Ctrl-b d`: detach khỏi session (công việc vẫn chạy nền); `tmux attach -t instagram_project` để vào lại.
  - `Ctrl-b &`: đóng window hiện tại.

### Chạy nhiều dev server cùng lúc (khác cổng)
Khi nhiều worktree cần chạy dev server song song, đổi cổng để không đụng cổng mặc định (`8081` cho backend, `3000` cho frontend):
```bash
# Backend ở cổng 8082 (cho phép CORS từ frontend cổng 3001)
cd backend_instagram
SERVER_PORT=8082 CORS_ALLOWED_ORIGINS=http://localhost:3001 ./mvnw spring-boot:run

# Frontend ở cổng 3001 (trỏ API về backend cổng 8082)
cd Social-app-fontend
PORT=3001 REACT_APP_API_URL=http://localhost:8082 pnpm start
```

### Vùng sở hữu
- Vùng sửa ghi trong `.agent-scope` ở gốc worktree (một glob mỗi dòng, `*` khớp cả `/`). File này không bị commit.
- Mọi thứ ngoài `.agent-scope` là read-only. Sửa ngoài vùng sẽ bị hook chặn.
- Backend chia theo tầng, nên vùng backend giao theo tên file (`**/*Story*`) hoặc `messaging/`, `event/`, `src/test/**` tương ứng. Cần xác nhận quy ước tên khi giao.
- Frontend giao theo `src/Pages/<tên>/`, `src/Components/<tên>/`, `src/Admin/`, `src/Service/<tên>Api.js`.

### File shared
- Danh sách duy nhất: [scripts/agent/shared-paths.txt](scripts/agent/shared-paths.txt). Không tự ý sửa. Sửa trực tiếp mà không theo quy trình thì dễ conflict lockfile, schema và route.
- Cần đổi shared: ghi đề xuất vào báo cáo cuối (file, dòng cần thêm). Không sửa.
- Bắt buộc sửa: commit riêng, `AGENT_ALLOW_SHARED=1`, message bắt đầu `shared:`. Sửa tối thiểu.
- Không thêm dependency. Ghi tên package và lý do vào báo cáo; integrator sẽ cài.
- Không sửa schema (`entity/*`, `migration/*`). `ddl-auto=update` tự đổi DB, nên entity sai sẽ đổi DB của mọi người.

### Điều phối
- Bảng claims: `.git/agent-claims.txt` (chung mọi worktree, không đi theo branch). Dòng: `agent | branch | glob`.
- Xem bảng bằng `scripts/agent/claims.sh list` trước khi bắt đầu và trước mỗi commit.
- Claim được thêm khi tạo worktree. Trùng claim thì dừng phần đó, ghi xung đột vào báo cáo, chuyển việc khác.
- Xong thì `scripts/agent/claims.sh rm` (xoá claim của branch hiện tại).

### Giới hạn thông tin
- Không đọc diff, branch hay code của agent khác để "tìm hiểu". Chỉ dùng bảng claims.
- Không `git log`/`git diff`/`git checkout` vào branch khác. Việc đó làm lộ thay đổi dở dang và dễ copy code chưa merge.

### Đồng bộ
- Commit nhỏ, đúng vùng. Hook `pre-commit` kiểm tra checkout chính, nhánh `master`, scope, shared, claim, `.env`.
- Trước khi báo xong: `git fetch origin && git rebase origin/master`, rồi chạy `./mvnw test` (backend) hoặc `pnpm build` (frontend).
- Conflict ở file ngoài vùng: dừng và báo. Không tự giải.

### Merge
- Merge tuần tự từng PR, theo thứ tự PR sẵn sàng. Mỗi PR rebase lại sau PR trước.
- Chỉ integrator chạy `pnpm install` và sửa `pnpm-lock.yaml`. Agent khác không đụng lockfile.
- Migration: agent không viết SQL. Integrator tạo `backend_instagram/migration/YYYY-MM-<tên>.sql` theo mẫu file hiện có.
- `target/`, `build/`, `node_modules/` đã bị gitignore. Không commit.

### Kết thúc và dọn dẹp
Sau khi PR đã được merge:
```bash
# 1. Xoá claim (chạy trong worktree của nhánh đó hoặc truyền AGENT_BRANCH=<nhánh>)
./scripts/agent/claims.sh rm

# 2. Về checkout chính, xoá worktree (dùng --force nếu có node_modules/.env symlink), xoá nhánh local và prune nhánh remote
cd "$(dirname "$(git rev-parse --git-common-dir)")"
git worktree remove --force ../instagram_project.worktrees/<loại>-<mô-tả>
git branch -d <loại/mô-tả>
git fetch --prune

# 3. Đóng window tmux của công việc (nếu đang mở)
tmux kill-window -t "instagram_project:<loại>-<mô-tả>" 2>/dev/null || true
```
- Báo cáo ngắn: file đã đổi, đề xuất cho shared, điều agent khác cần biết.
