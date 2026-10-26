# AGENTS.md

Quy tắc làm việc cho AI agent (và người) trong repo `haole2k4/instagram_project`.

## Bối cảnh repo

- Đây là **fork** của `doanhdai/instagram_project` (upstream). Repo làm việc chính là `haole2k4/instagram_project`.
- Nhánh mặc định: `master`.
- Cấu trúc:
  - `backend_instagram/`: Spring Boot 4.1 (Java 25, Maven wrapper `./mvnw`), MySQL, Redis cache, S3 (LocalStack), WebSocket/STOMP.
  - `Social-app-fontend/`: React 19 (react-app-rewired, pnpm), Tailwind.
  - `k8s/`: manifest kind + ingress-nginx. `docker-compose.yml`, `Makefile`, `localstack-init/` ở thư mục gốc.

## Quy trình Git (bắt buộc)

1. **Không commit trực tiếp lên `master`.** Mọi thay đổi, kể cả sửa nhỏ hoặc chỉ sửa tài liệu, đều làm trên một nhánh mới tạo từ `master` mới nhất.
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
8. **Bắt buộc xoá nhánh sau khi merge PR.** Ngay sau khi PR được merge, xoá cả nhánh remote lẫn nhánh local:
   ```bash
   gh pr merge <số-PR> --repo haole2k4/instagram_project --merge --delete-branch
   git branch -d <nhánh>   # hoặc `-D` nếu nhánh chưa được merge fast-forward
   git fetch --prune
   ```
   Không để lại nhánh đã merge (remote hoặc local). Nếu merge qua giao diện GitHub, nhớ xoá nhánh ở cả hai nơi sau đó.

## Repo gốc (upstream)

- Không đụng tới `doanhdai/instagram_project`: không fetch, merge, rebase từ đó, không push hay tạo PR sang đó. Chỉ làm việc với `haole2k4/instagram_project`.
- Mọi thao tác push (nhánh và tag) chỉ dùng remote `origin` (`git@github.com:haole2k4/instagram_project.git`). Không bao giờ push bằng `upstream`.
- Remote `upstream` đã bị vô hiệu hoá push (`git remote set-url --push upstream no_push`); không khôi phục URL push của nó. Nếu vô tình push sang `doanhdai`, báo lại ngay để xử lý.

## Bảo mật và cấu hình

- Không commit secret: `.env`, mật khẩu, API key (`GEMINI_API_KEY`, `JWT_BASE64_SECRET`, key AWS), `k8s/secret.yaml`. Chỉ cập nhật các file mẫu (`.env.example`, `k8s/secret.example.yaml`).
- Không sửa và không commit mọi file `.env`, kể cả `Social-app-fontend/.env` (hiện đang bị track trong git dù `.gitignore` đã chặn). Cần đổi biến môi trường thì cập nhật file mẫu và báo lại.
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

## Làm việc song song nhiều worktree

Áp dụng khi nhiều agent chạy cùng lúc. Một agent làm một mình vẫn theo các mục trên.
Cơ chế: [scripts/agent/](scripts/agent/) và [scripts/githooks/](scripts/githooks/). Hook chạy khi `core.hooksPath=scripts/githooks` (script tạo worktree tự đặt).

### Khởi tạo
- Tạo worktree bằng `scripts/agent/new-worktree.sh <loại/mô-tả> <agent> '<glob>'...`. Không dùng `git worktree add` tay.
- Script tạo worktree ở `../instagram_project.worktrees/<loại>-<mô-tả>`, branch từ `origin/master`. Sai gốc thì rebase khó và lẫn commit của người khác.
- Branch đặt theo `<loại>/<kebab-case>` như mục Git ở trên. Script từ chối tên sai.

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
- Commit nhỏ, đúng vùng. Hook `pre-commit` kiểm tra scope, shared, claim, `.env`.
- Trước khi báo xong: `git fetch origin && git rebase origin/master`, rồi chạy `./mvnw test` (backend) hoặc `pnpm build` (frontend).
- Conflict ở file ngoài vùng: dừng và báo. Không tự giải.

### Merge
- Merge tuần tự từng PR, theo thứ tự PR sẵn sàng. Mỗi PR rebase lại sau PR trước.
- Chỉ integrator chạy `pnpm install` và sửa `pnpm-lock.yaml`. Agent khác không đụng lockfile.
- Migration: agent không viết SQL. Integrator tạo `backend_instagram/migration/YYYY-MM-<tên>.sql` theo mẫu file hiện có.
- `target/`, `build/`, `node_modules/` đã bị gitignore. Không commit.

### Kết thúc
- `scripts/agent/claims.sh rm`, rồi sau khi PR merge: `git worktree remove <đường dẫn>`.
- Báo cáo ngắn: file đã đổi, đề xuất cho shared, điều agent khác cần biết.
