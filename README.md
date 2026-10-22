# Social App

Ứng dụng mạng xã hội gồm frontend React và backend Spring Boot. Có hai cách chạy:

- **Docker Compose** (mặc định, nhanh nhất): MySQL, Redis cache, RabbitMQ, LocalStack S3, backend, seed dữ liệu demo và frontend.
- **Kubernetes local (kind)**: cùng stack nhưng chạy trong cluster, có thể scale và dùng Ingress.

Backend dùng Redis để cache các truy vấn đọc nhiều (feed, bình luận, thống kê người dùng), giúp giảm tải MySQL. RabbitMQ xử lý việc đẩy notification like/comment realtime sau khi request đã commit.

## Yêu cầu

- Docker Desktop hoặc Docker Engine với Docker Compose
- Các cổng `3000`, `3306`, `4566`, `5672`, `6379` và `8081` chưa được ứng dụng khác sử dụng; AMQP và management UI RabbitMQ chỉ bind localhost (`5672`, `15672`)
- Riêng Kubernetes: thêm `kubectl`, `kind`, `make` và cổng `80`/`443` còn trống

## Chạy ứng dụng

Từ thư mục gốc dự án:

```bash
docker compose up --build -d
docker compose ps
```

Mở frontend tại [http://localhost:3000](http://localhost:3000). Backend API chạy tại `http://localhost:8081`; health endpoint là `http://localhost:8081/actuator/health`.

Khi chạy frontend riêng bằng `pnpm start` (không qua Docker), sao chép `Social-app-fontend/.env.example` thành `Social-app-fontend/.env`. File `.env` không được commit.

Seed tạo ba tài khoản demo dùng chung mật khẩu `InstagramDemo!2026`:

| Email | Tên hiển thị |
| --- | --- |
| `admin@instagram.local` | Demo Admin |
| `linh@instagram.local` | Linh Nguyen |
| `minh@instagram.local` | Minh Tran |

Tài khoản Demo Admin dùng để đăng nhập và thử dữ liệu mẫu. Backend hiện chưa có cơ chế role superuser, nên tên tài khoản không đồng nghĩa với quyền quản trị đặc biệt.

## Lệnh thường dùng

```bash
# Xem log

docker compose logs -f backend frontend rabbitmq

# Kiểm tra RabbitMQ

docker compose exec rabbitmq rabbitmq-diagnostics -q ping
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers

# Dừng các dịch vụ, giữ dữ liệu trong volumes

docker compose down

# Xóa cả dữ liệu MySQL, LocalStack, Redis cache và RabbitMQ để khởi tạo lại từ đầu

docker compose down -v
```

`docker compose down -v` xóa dữ liệu trong database, LocalStack, Redis cache và RabbitMQ. Seed chạy lại khi Compose khởi động; các bản ghi đã có được giữ nguyên.

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
- `JWT_BASE64_SECRET`, `JWT_TOKEN_VALIDITY_SECONDS`, `JWT_REFRESH_TOKEN_VALIDITY_SECONDS`
- `GEMINI_API_KEY` để bật tính năng Gemini
- `REDIS_PORT`, `CACHE_TTL_POSTS`, `CACHE_TTL_COMMENTS`, `CACHE_TTL_USER_STATS`
- `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST`, `RABBITMQ_PORT`, `RABBITMQ_MANAGEMENT_PORT`, `MQ_ENABLED`, `MQ_NOTIFICATION_CONCURRENCY`

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
docker-compose.yml   Bộ dịch vụ phát triển local
Makefile             Lệnh tắt cho Compose và Kubernetes
```

Frontend source hiện được giữ trong `Social-app-fontend` (tên thư mục giữ nguyên như repo gốc). Backend standalone hướng dẫn cài đặt nằm trong `backend_instagram/README.md`.
