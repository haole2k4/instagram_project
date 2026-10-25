# Social App

Ứng dụng mạng xã hội gồm frontend React và backend Spring Boot. Có hai cách chạy:

- **Docker Compose** (mặc định, nhanh nhất): MySQL, Redis cache, RabbitMQ, LocalStack S3, backend và frontend; seed dữ liệu demo chạy theo profile riêng khi cần.
- **Kubernetes local (kind)**: cùng stack nhưng chạy trong cluster, có thể scale và dùng Ingress.

Backend dùng Redis để cache các truy vấn đọc nhiều (feed, bình luận, thống kê người dùng), giúp giảm tải MySQL. RabbitMQ xử lý việc đẩy notification like/comment realtime sau khi request đã commit.

## Yêu cầu

- Docker Desktop hoặc Docker Engine với Docker Compose
- Các cổng `3000`, `4566` và `8081` chưa được ứng dụng khác sử dụng. MySQL (`3306`), Redis (`6379`), AMQP (`5672`) và management UI RabbitMQ (`15672`) chỉ bind `127.0.0.1`, nên chỉ truy cập được từ máy host.
- Riêng Kubernetes: thêm `kubectl`, `kind`, `make` và cổng `80`/`443` còn trống

## Chạy ứng dụng

Từ thư mục gốc dự án:

```bash
docker compose up --build -d
docker compose ps
```

Mở frontend tại [http://localhost:3000](http://localhost:3000). Backend API chạy tại `http://localhost:8081`; health endpoint là `http://localhost:8081/actuator/health`.

Seed dữ liệu demo **không còn chạy tự động** khi `docker compose up`. Sau khi backend healthy, chạy một lần:

```bash
docker compose --profile seed up seed
```

Lệnh này chỉ nạp dữ liệu một lần rồi thoát; các bản ghi đã có được giữ nguyên nên chạy lại vẫn an toàn. Bỏ bước này nếu chỉ cần database trống.

Khi chạy frontend riêng bằng `pnpm start` (không qua Docker), sao chép `Social-app-fontend/.env.example` thành `Social-app-fontend/.env`. File `.env` không được commit.

Seed tạo ba tài khoản demo dùng chung mật khẩu `InstagramDemo!2026`:

| Email | Tên hiển thị |
| --- | --- |
| `admin@instagram.local` | Demo Admin |
| `linh@instagram.local` | Linh Nguyen |
| `minh@instagram.local` | Minh Tran |

Tài khoản Demo Admin dùng để đăng nhập và thử dữ liệu mẫu. Backend hiện chưa có cơ chế role superuser, nên tên tài khoản không đồng nghĩa với quyền quản trị đặc biệt.

### Giới hạn tài nguyên và log

`backend` và `mysql` có memory limit mặc định `1g` mỗi service để một container không chiếm hết RAM máy host. Override bằng biến môi trường trong `.env`, ví dụ `BACKEND_MEM_LIMIT=2g` hoặc `MYSQL_MEM_LIMIT=1536m`.

Backend chạy với `-XX:MaxRAMPercentage=75.0`, nhưng cờ này **chỉ có tác dụng khi container có memory limit**: JVM lấy 75% của limit làm heap tối đa. Nếu bỏ `mem_limit` thì Java đọc RAM của máy host và có thể bị OOM kill.

Mọi service dùng log driver `json-file` với `max-size=10m`, `max-file=3`, nên log không phình vô hạn trên đĩa.

## Lệnh thường dùng

```bash
# Xem log

docker compose logs -f backend frontend rabbitmq

# Kiểm tra RabbitMQ

docker compose exec rabbitmq rabbitmq-diagnostics -q ping
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers

# Dừng các dịch vụ, giữ dữ liệu trong volumes

docker compose down

# Xóa dữ liệu MySQL và RabbitMQ để khởi tạo lại từ đầu (Redis, LocalStack là dữ liệu tạm)

docker compose down -v
```

`docker compose down -v` xóa dữ liệu trong database và RabbitMQ. Redis chỉ là cache và LocalStack chỉ là S3 tạm nên cả hai không có volume và mất dữ liệu khi container dừng. Seed không tự chạy lại; dùng lệnh `docker compose --profile seed up seed` khi cần nạp lại dữ liệu demo.

MySQL dùng image `8.4` (LTS). Volume `mysql_data` do MySQL 8.0 tạo trước đây không được dùng lại an toàn: chạy `docker compose down -v` một lần khi nâng cấp từ bản cũ để tạo database mới, rồi seed lại. Dữ liệu cũ trong volume sẽ mất.

LocalStack community image không hỗ trợ snapshot persistence (endpoint `/_localstack/state` trả 404), nên S3 local là dữ liệu tạm: bucket `instagram-media` được tạo lại mỗi lần container khởi động bởi `localstack-init`, và `docker compose down` xoá luôn dữ liệu. Không có volume LocalStack.

## Redis cache

Backend dùng Redis làm cache cho các truy vấn đọc nhiều:

| Cache | Nội dung | TTL mặc định | Biến môi trường |
| --- | --- | --- | --- |
| `posts` | Danh sách feed, bài viết theo user, bài viết của người đang follow | 60s | `CACHE_TTL_POSTS` |
| `comments` | Bình luận theo bài viết | 60s | `CACHE_TTL_COMMENTS` |
| `userStats` | Số follower/following/bài viết của user | 120s | `CACHE_TTL_USER_STATS` |

Cache được tự động xoá khi dữ liệu thay đổi (tạo/sửa/xoá bài viết, like, bình luận, follow/unfollow). Key trong Redis có tiền tố `instagram:` và có thể xem nhanh:

```bash
docker compose exec redis redis-cli --scan
docker compose exec redis redis-cli ttl "instagram:posts::all"
```

Redis chỉ được dùng làm cache nên chạy với `--save "" --appendonly no`: không ghi ra đĩa và không có volume. Container dừng hoặc `docker compose down` sẽ làm mất cache; dữ liệu thật vẫn nằm trong MySQL.

Có thể tắt cache mà không cần sửa code bằng cách đặt `spring.cache.type=none` (ví dụ qua biến môi trường `SPRING_CACHE_TYPE=none`).

## RabbitMQ và notification bất đồng bộ

Like/comment vẫn ghi notification vào MySQL trong transaction của request. Sau khi commit, backend publish event lên RabbitMQ trên một executor riêng; consumer đẩy STOMP và đánh dấu `notifications.pushed_at`. MySQL là nguồn sự thật: nếu broker chết hoặc message bị mất, API vẫn thành công và client vẫn đọc được notification qua REST.

| Thành phần | Giá trị |
| --- | --- |
| Exchange | `instagram.events` (direct, durable) |
| Queue | `notification.dispatch` (quorum, durable) |
| Routing key | `notification.created` |
| Dead-letter exchange | `instagram.dlx` |
| Dead-letter queue | `notification.dlq` (quorum) |
| Retry | 3 lần retry (tổng 4 lần thử), backoff 1s → 2s → 4s, hết lượt vào DLQ |
| Idempotency | Consumer chỉ push khi `pushed_at` còn `NULL` |

Consumer là at-least-once. Nếu message được redeliver sau khi đã push nhưng trước khi commit, frontend bỏ qua theo `notificationId`.

Quản lý RabbitMQ local tại [http://localhost:15672](http://localhost:15672). Tài khoản mặc định là `instagram` / `instagram_pass`; đổi bằng `RABBITMQ_USERNAME` / `RABBITMQ_PASSWORD` trong `.env` trước khi chạy lần đầu. Management UI chỉ bind `127.0.0.1`, không mở ra mạng ngoài.

Các biến môi trường liên quan:

- `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST`
- `MQ_ENABLED` (mặc định `true`; đặt `false` để tắt publisher/consumer)
- `MQ_NOTIFICATION_CONCURRENCY` (số consumer mặc định `2`)
- `MQ_NOTIFICATION_MAX_ATTEMPTS`, `MQ_NOTIFICATION_RETRY_INITIAL_MS`, `MQ_NOTIFICATION_RETRY_MULTIPLIER`

Health: `GET /actuator/health` trả trạng thái tổng hợp, gồm cả RabbitMQ. Compose và Kubernetes dùng `rabbitmq-diagnostics -q ping` cho probe của broker. RabbitMQ không nằm trong readiness group của backend để broker chết không làm mất API; notification realtime sẽ mất cho đến khi broker hoạt động lại.

### DLQ runbook

Khi có message trong `notification.dlq`:

```bash
# Xem số message đang chờ ở từng queue
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers

# Xem log consumer để tìm eventId/notificationId lỗi
docker compose logs --tail=200 backend
```

Mở management UI, vào **Queues → notification.dlq**, dùng **Get messages** để đọc headers/body. Sửa nguyên nhân (thường là payload sai hoặc lỗi DB tạm thời), rồi publish lại message đã sửa vào exchange `instagram.events` với routing key `notification.created`. Nếu message là dữ liệu rác không thể sửa, xoá khỏi DLQ sau khi ghi nhận. Không purge DLQ hàng loạt khi chưa điều tra vì sẽ mất dấu vết lỗi.

Chạy test backend (cần Docker cho Testcontainers MySQL và RabbitMQ):

```bash
cd backend_instagram
./mvnw test
```

## Tự động deploy khi có code mới

`scripts/auto-deploy.sh` cứ 2 phút kiểm tra `origin/master` một lần (chạy bằng systemd user timer). Nếu có commit mới, script sẽ fast-forward pull rồi build và chạy lại stack. Không cần mở cổng vào máy hay dùng GitHub runner.

```bash
# Nên dùng một bản clone riêng để deploy, tách khỏi thư mục đang code
git clone https://github.com/haole2k4/instagram_project.git ~/deploy/instagram_project
cp .env ~/deploy/instagram_project/.env
cd ~/deploy/instagram_project

make auto-deploy-install          # cài + bật timer
loginctl enable-linger "$USER"    # để timer chạy cả khi chưa đăng nhập
make auto-deploy-logs             # xem log
make auto-deploy                  # deploy ngay, không cần chờ có commit mới
make auto-deploy-uninstall        # tắt
```

- Mặc định deploy bằng Docker Compose (`docker compose up --build -d --wait`). Muốn deploy lên kind thì ghi `DEPLOY_TARGET=k8s` vào `~/.config/instagram-auto-deploy.env`, khi đó script chạy `make k8s-redeploy`. Các biến khác: `DEPLOY_BRANCH`, `DEPLOY_REMOTE`, `DEPLOY_WAIT_TIMEOUT`, `DOCKER_CONTEXT` (nên đặt `DOCKER_CONTEXT=default` nếu máy cài cả Docker Desktop để timer luôn dùng Docker Engine hệ thống).
- Script sẽ dừng, không pull, nếu thư mục deploy không ở nhánh `master` hoặc có thay đổi tracked chưa commit. Nếu không fast-forward được, script cũng dừng.
- Commit chỉ sửa file `.md` hoặc thư mục `.github/` thì không build lại.
- PR và nhánh `master` được kiểm tra tự động qua GitHub Actions (`.github/workflows/ci.yml`: `./mvnw test` + `pnpm build`) trên runner của GitHub.
- Nếu build lỗi, Compose vẫn giữ các container cũ đang chạy. Nếu bản mới không healthy, lần chạy đó báo lỗi trong journal, và script chỉ thử lại khi có commit mới hoặc khi chạy `make auto-deploy`. Script không tự rollback.
- Compose project name lấy theo tên thư mục. Clone vào thư mục cũng tên `instagram_project` thì stack dùng lại container và volume dữ liệu hiện có.

## Kubernetes local với kind

Stack K8s nằm trong thư mục `k8s/`, dùng kind + ingress-nginx.

### Chạy lần đầu

```bash
# 1. Tạo cluster, cài ingress, build image, nạp image vào kind,
#    tạo secret từ .env và deploy toàn bộ stack
make k8s-up

# 2. Thêm host vào /etc/hosts (một lần)
echo "127.0.0.1 instagram.local" | sudo tee -a /etc/hosts
```

Mở [http://instagram.local](http://instagram.local). Kiểm tra trạng thái:

```bash
make k8s-status
make k8s-logs
```

### Sau khi sửa code

```bash
make k8s-redeploy
```

### Các thành phần trong cluster

| Thành phần | Loại | Ghi chú |
| --- | --- | --- |
| `backend` | Deployment + Service | 1 replica mặc định, probe `/actuator/health/*` |
| `frontend` | Deployment + Service | nginx, build với `REACT_APP_API_URL=http://instagram.local` |
| `mysql` | StatefulSet + PVC 10Gi | dữ liệu được giữ khi pod restart |
| `redis` | Deployment + Service | cache tạm, dùng `emptyDir` |
| `rabbitmq` | StatefulSet + Service + PVC 1Gi | broker cho notification, 1 replica, probe `rabbitmq-diagnostics -q ping` |
| `localstack` | Deployment + Service | S3 giả lập |
| `localstack-init` | Job | tạo bucket `instagram-media` và policy public-read |
| `seed-demo` | Job | nạp dữ liệu demo sau khi backend tạo schema |
| Ingress | `instagram`, `instagram-websocket`, `instagram-s3` | định tuyến `/`, `/api`, `/ws`, `/s3` |

Secret (`JWT_BASE64_SECRET`, mật khẩu DB, `RABBITMQ_PASSWORD`, ...) được tạo từ `.env` bằng `./k8s/create-secrets.sh`, không commit vào git.

RabbitMQ management chỉ có trong cluster; xem qua port-forward:

```bash
kubectl -n instagram port-forward svc/rabbitmq 15672:15672
# Mở http://localhost:15672, dùng RABBITMQ_USERNAME/RABBITMQ_PASSWORD
```

### Xoá cluster

```bash
make k8s-down
```

Lưu ý: `make k8s-up` map cổng `80`/`443` của máy host vào ingress, nên cần tắt các web server đang chiếm cổng này.

### Hạn chế đã biết

Backend dùng STOMP simple broker trong bộ nhớ. RabbitMQ chỉ xử lý dispatch notification, không thay thế STOMP broker. Nếu tăng `replicas` của backend lên >1, tin nhắn chat/notification có thể không đến được client đang kết nối vào pod khác. Giữ 1 replica cho đến khi bổ sung Redis pub/sub hoặc STOMP relay cho WebSocket.

## Cấu hình

Compose dùng file `.env` ở thư mục gốc cho cấu hình local; không commit file này. Tạo secret JWT riêng trước khi chạy bằng cách đặt `JWT_BASE64_SECRET` trong `.env`. Các biến thường dùng:

- `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `DB_PORT`
- `BACKEND_MEM_LIMIT`, `MYSQL_MEM_LIMIT` (memory limit của container, mặc định `1g`)
- `JWT_BASE64_SECRET`, `JWT_TOKEN_VALIDITY_SECONDS`, `JWT_REFRESH_TOKEN_VALIDITY_SECONDS`
- `GEMINI_API_KEY` để bật tính năng Gemini
- `REDIS_PORT`, `CACHE_TTL_POSTS`, `CACHE_TTL_COMMENTS`, `CACHE_TTL_USER_STATS`
- `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST`, `RABBITMQ_PORT`, `RABBITMQ_MANAGEMENT_PORT`, `MQ_ENABLED`, `MQ_NOTIFICATION_CONCURRENCY`

Access token mặc định sống 30 phút, refresh token 7 ngày. Khi triển khai bản có RBAC, hãy đổi `JWT_BASE64_SECRET` để vô hiệu hoá token cũ; token phát hành trước đó không có claim `roles`.

### Admin

- UI: `/admin` (yêu cầu role `MODERATOR` hoặc `ADMIN`).
- `ADMIN` xem được audit log, ban/khôi phục tài khoản; `MODERATOR` xử lý báo cáo và ẩn nội dung.
- Seed demo tạo `admin@instagram.local` và `moderator@instagram.local`; xem `backend_instagram/seed-demo.sql`.
- Với database đang có dữ liệu, chạy một lần `backend_instagram/migration/2026-10-admin-rbac.sql` trước khi khởi động backend. Database mới do Hibernate tạo schema rồi seed.
- Chi tiết quyền, trạng thái và API: `ADMIN_SPEC.md`.

S3 được trỏ tới LocalStack và tự tạo bucket `instagram-media`. Mặc định AWS/Gemini credentials trong môi trường Compose chỉ dành cho local; cần thay bằng secrets riêng khi triển khai thật.

## Chạy frontend ngoài Docker

```bash
cd Social-app-fontend
pnpm install --frozen-lockfile
REACT_APP_API_URL=http://localhost:8081 pnpm start
```

## Cấu trúc chính

```text
Social-app-fontend/  React frontend, Dockerfile và nginx config
backend_instagram/   Spring Boot API, Dockerfile và seed-demo.sql
localstack-init/     Khởi tạo bucket S3 local
k8s/                 Manifest Kubernetes (kind) + script tạo secret
scripts/             auto-deploy.sh (tự pull + deploy)
deploy/systemd/      Unit systemd cho auto-deploy
docker-compose.yml   Bộ dịch vụ phát triển local
Makefile             Lệnh tắt cho Compose và Kubernetes
```

Frontend source hiện được giữ trong `Social-app-fontend` (tên thư mục giữ nguyên như repo gốc). Backend standalone hướng dẫn cài đặt nằm trong `backend_instagram/README.md`.
