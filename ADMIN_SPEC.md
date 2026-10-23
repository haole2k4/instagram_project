# Admin Dashboard — Specification

Tài liệu này là nguồn sự thật cho phần quản trị: phân quyền, trạng thái tài khoản,
kiểm duyệt nội dung, audit log và dashboard. Phần UI tuân theo `ART_DIRECTION.md`.

## 1. Quyết định đã chốt

| Chủ đề | Quyết định |
| --- | --- |
| Role | `USER`, `MODERATOR`, `ADMIN`. Mọi tài khoản có `USER`; staff có thêm role. Không có UI/API đổi role trong MVP. |
| Phân quyền | Backend kiểm tra URL + method security; frontend chỉ chặn route và ẩn/hiện action. |
| Admin cuối | Không được xóa, vô hiệu hóa hoặc hạ quyền admin `ACTIVE` cuối cùng. |
| Ban | `ACTIVE`, `SUSPENDED` (có `suspended_until`), `BANNED` (vĩnh viễn). |
| Tác động ban | Chặn ghi (post/comment/like/follow/DM/profile edit); ẩn nội dung công khai; giữ DM, follow, like cũ. |
| Restore | `MODERATOR`: ẩn/gỡ nội dung, đình chỉ tạm thời. `ADMIN`: khôi phục nội dung, đảo ngược quyết định, ban vĩnh viễn. |
| Appeals | V2. MVP chỉ lưu report/decision/audit đủ để gắn appeals sau. |
| Analytics | Không DAU/MAU. KPI lấy từ dữ liệu hiện có. |
| Report target | `POST`, `COMMENT`, `USER`. `STORY` V2. |
| Sidebar | Desktop 240px mở, 64px thu gọn; mobile drawer. |
| Audit | Append-only, ghi trong cùng transaction với hành động. Trang đọc log ở phase 6; hạ tầng audit từ phase 2. |

### Diễn giải triển khai

1. Tài khoản bị hạn chế vẫn đăng nhập được ở chế độ chỉ đọc để xem trạng thái và
   DM cũ. Mọi request ghi bị chặn ở backend, trừ `auth/login`, `auth/refresh`,
   `auth/logout`.
2. Ẩn theo tác giả áp dụng cho toàn bộ nội dung công khai: profile, post, comment,
   story, danh sách user. DM và follow giữ nguyên.
3. Staff không bị moderate qua API: `MODERATOR` chỉ tác động lên `USER`; `ADMIN`
   tác động lên `USER` và `MODERATOR`; tài khoản `ADMIN` chỉ thay đổi bằng
   seed/CLI có kiểm tra invariant.
4. Đình chỉ tạm thời dùng preset 1, 3, 7, 30 ngày.
5. Access token 30 phút, refresh 7 ngày. Token cũ phải bị vô hiệu hóa khi deploy
   (rotate `JWT_BASE64_SECRET`) vì token cũ sống rất lâu và không có roles.

## 2. Quyền

### Authority

- `USER` → `ROLE_USER`
- `MODERATOR` → `ROLE_USER`, `ROLE_MODERATOR`
- `ADMIN` → `ROLE_USER`, `ROLE_MODERATOR`, `ROLE_ADMIN`

JWT chứa identity + roles tại thời điểm phát hành. Status được kiểm tra lại ở
backend mỗi request.

### Ma trận

| Hành động | USER | MODERATOR | ADMIN |
| --- | --- | --- | --- |
| Dùng tính năng mạng xã hội | ✅ | ✅ | ✅ |
| Xem dashboard vận hành | ❌ | ✅ | ✅ |
| Xem/claim/xử lý report | ❌ | ✅ (trừ report của mình) | ✅ (trừ report của mình) |
| Ẩn/gỡ post, comment | ❌ | ✅ | ✅ |
| Khôi phục nội dung | ❌ | ❌ | ✅ |
| Đình chỉ tạm thời USER | ❌ | ✅ | ✅ |
| Ban vĩnh viễn | ❌ | ❌ | ✅ |
| Khôi phục tài khoản | ❌ | ❌ | ✅ |
| Xem audit log | ❌ | ❌ | ✅ |
| Đổi role | ❌ | ❌ | ❌ (seed/CLI) |

### Invariant admin cuối

- Admin active = user có role `ADMIN` và status `ACTIVE` (hoặc `SUSPENDED` đã hết hạn).
- Mọi thao tác có thể làm giảm số admin active phải chạy trong transaction, khóa
  các dòng admin (`SELECT ... FOR UPDATE`) rồi đếm lại.
- Kết quả 0 → `409 LAST_ADMIN`.
- Không tự ban/tự đình chỉ/tự hạ quyền chính mình.

## 3. Trạng thái tài khoản

| Status | Ý nghĩa | `suspended_until` |
| --- | --- | --- |
| `ACTIVE` | Bình thường | `NULL` |
| `SUSPENDED` | Tạm đình chỉ | Bắt buộc, ở tương lai |
| `BANNED` | Vĩnh viễn | `NULL` |

- Scheduled job mỗi 60 giây chuyển `SUSPENDED` hết hạn về `ACTIVE` và ghi audit
  `ACCOUNT_SUSPENSION_EXPIRED` với actor `SYSTEM`. Request filter cũng tính
  effective status để quyền ghi mở ngay.
- Không hard-delete user. `isOnline` chỉ là presence, không phải trạng thái tài khoản.

### Chặn hành vi

- Chặn mọi request ghi khi `SUSPENDED`/`BANNED`, trừ auth allowlist.
- Trả `403 ACCOUNT_RESTRICTED` kèm `status`, `suspendedUntil`.
- Không chặn đọc feed, profile của mình, DM history, notification.
- Không xóa follow, like, DM, notification.

### Ẩn nội dung công khai

Query công khai lọc:

```
author.status = 'ACTIVE'
AND content.moderation_state = 'VISIBLE'
```

Áp dụng cho feed, post theo user, post following, comment, story, search, profile,
danh sách user. Chủ tài khoản và admin vẫn xem được nội dung của mình.

Khôi phục tài khoản chỉ đổi status, không tự bỏ `HIDDEN` của nội dung bị gỡ riêng.

## 4. Database schema

### Bảng mới

```sql
CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reporter_id BIGINT NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  note VARCHAR(1000) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  assignee_id BIGINT NULL,
  claimed_at DATETIME(6) NULL,
  decided_by BIGINT NULL,
  action VARCHAR(32) NULL,
  decision_note VARCHAR(1000) NULL,
  decided_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_report_reporter_target (reporter_id, target_type, target_id),
  KEY idx_reports_status_created (status, created_at),
  KEY idx_reports_assignee_status (assignee_id, status),
  KEY idx_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_reports_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),
  CONSTRAINT fk_reports_decider FOREIGN KEY (decided_by) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT NULL,
  actor_label VARCHAR(128) NOT NULL,
  action VARCHAR(48) NOT NULL,
  target_type VARCHAR(16) NULL,
  target_id BIGINT NULL,
  report_id BIGINT NULL,
  reason_code VARCHAR(32) NULL,
  reason_text VARCHAR(1000) NULL,
  metadata JSON NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME(6) NOT NULL,
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor (actor_id, created_at),
  KEY idx_audit_target (target_type, target_id),
  KEY idx_audit_action (action, created_at)
);
```

`audit_logs` không có FK tới actor/target để không mất dấu khi dữ liệu đổi.
Không có API update/delete audit.

### Cột thêm

```sql
ALTER TABLE users
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN suspended_until DATETIME(6) NULL,
  ADD COLUMN status_reason_code VARCHAR(32) NULL,
  ADD COLUMN status_reason VARCHAR(500) NULL,
  ADD COLUMN status_changed_at DATETIME(6) NULL,
  ADD COLUMN status_changed_by BIGINT NULL;

ALTER TABLE posts
  ADD COLUMN moderation_state VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN moderation_reason_code VARCHAR(32) NULL,
  ADD COLUMN moderation_reason VARCHAR(500) NULL,
  ADD COLUMN moderated_at DATETIME(6) NULL,
  ADD COLUMN moderated_by BIGINT NULL;

ALTER TABLE comments
  ADD COLUMN moderation_state VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN moderation_reason_code VARCHAR(32) NULL,
  ADD COLUMN moderation_reason VARCHAR(500) NULL,
  ADD COLUMN moderated_at DATETIME(6) NULL,
  ADD COLUMN moderated_by BIGINT NULL;

ALTER TABLE stories
  ADD COLUMN moderation_state VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN moderation_reason_code VARCHAR(32) NULL,
  ADD COLUMN moderation_reason VARCHAR(500) NULL,
  ADD COLUMN moderated_at DATETIME(6) NULL,
  ADD COLUMN moderated_by BIGINT NULL;

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_posts_state_created ON posts(moderation_state, created_at);
CREATE INDEX idx_comments_state_created ON comments(moderation_state, created_at);
CREATE INDEX idx_stories_state_created ON stories(moderation_state, created_at);
```

### Quy ước

- `reason_code`: `SPAM`, `HARASSMENT`, `HATE`, `NUDITY`, `VIOLENCE`, `SELF_HARM`,
  `FALSE_INFO`, `IMPERSONATION`, `SCAM`, `POLICY_VIOLATION`, `OTHER`.
- Text tối đa 500–1000 ký tự, trim, không chứa HTML.
- Timestamp mới lưu UTC.
- Không lưu email/số điện thoại/password trong `metadata`.
- Restore nội dung: set `VISIBLE`, ghi lý do/thời điểm restore vào `moderation_*`;
  audit giữ lịch sử của cả hide và restore.

### Xung đột và migration

1. `posts.status` đang là chuỗi `"True"/"false"` cho cả user-delete và admin-delete cũ.
   Không đổi nghĩa. Thêm `moderation_state`; luồng mới dùng nó. Các post
   `status = 'false'` được coi là legacy user-deleted, không tự chuyển sang `HIDDEN`.
2. `stories.status` 0/1/2 giữ nguyên cho user-delete/expired. `moderation_state`
   chỉ dành cho admin.
3. `comments` mặc định `VISIBLE`.
4. Bỏ `DELETE /user/{id}` khỏi API; không hard-delete user.
5. JWT cũ sống rất lâu và mang permission hardcode. Deploy phải rotate
   `JWT_BASE64_SECRET` để vô hiệu hóa token cũ.
6. `ddl-auto=update` dùng cho dev. File `backend_instagram/migration/2026-10-admin-rbac.sql`
   là migration một lần cho DB đang có dữ liệu; backup trước khi chạy.
7. Endpoint cũ trả entity `User` từng lộ `userPassword`/`refreshToken`. Mọi API
   admin dùng DTO; entity User đã ẩn hai field này.

## 5. API

Envelope dùng `RestResponse` hiện có. Endpoint admin nằm dưới `/api/v1/admin/**`,
yêu cầu `MODERATOR` hoặc `ADMIN`; hành động nhạy cảm kiểm tra `ADMIN` ở method.

### User-facing

```http
POST /api/v1/reports
Body: { targetType, targetId, reasonCode, note }
```

- Chỉ user `ACTIVE`; target tồn tại đúng loại; không tự báo cáo mình/nội dung của mình.
- Unique `(reporter,targetType,targetId)` → `409 REPORT_ALREADY_EXISTS`.
- Tối đa 10 report/ngày/user → `409 REPORT_RATE_LIMIT`.

### Auth

`POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`,
`GET /auth/account`.

`login`/`account` trả thêm:

```json
{
  "roles": ["USER", "MODERATOR"],
  "status": "SUSPENDED",
  "suspendedUntil": "2026-11-01T00:00:00Z"
}
```

### Admin users

```http
GET  /api/v1/admin/users?q=&status=&role=&page=0&size=20&sort=createdAt,desc
GET  /api/v1/admin/users/{id}
POST /api/v1/admin/users/{id}/suspend   { reasonCode, note, durationDays }
POST /api/v1/admin/users/{id}/ban       { reasonCode, note }
POST /api/v1/admin/users/{id}/restore   { reasonCode, note }
```

- `MODERATOR` chỉ suspend `USER`; `ADMIN` suspend/ban/restore `USER` + `MODERATOR`.
- Không tác động `ADMIN`, không tự tác động.
- Không có endpoint đổi role, xóa user hoặc tạo user admin.
- `MODERATOR` thấy email che; `ADMIN` thấy đầy đủ.

### Admin reports

```http
GET  /api/v1/admin/reports?status=&targetType=&reasonCode=&assignee=me|unassigned&page=&size=&sort=createdAt,asc
GET  /api/v1/admin/reports/{id}
POST /api/v1/admin/reports/{id}/claim
POST /api/v1/admin/reports/{id}/decision
Body: { action: DISMISS|HIDE_CONTENT|SUSPEND_USER|BAN_USER, reasonCode, note, durationDays? }
```

- Claim conditional update; report không còn `OPEN` → `409 REPORT_ALREADY_CLAIMED`.
- Không claim/decide report mình gửi hoặc target là nội dung/tài khoản của mình.
- `MODERATOR`: `DISMISS`, `HIDE_CONTENT`, `SUSPEND_USER` (USER, preset).
- `ADMIN`: thêm `BAN_USER`; được decide report đã có assignee khác.
- `HIDE_CONTENT` chỉ cho `POST`/`COMMENT`; suspend/ban cho `USER` hoặc author.
- `DISMISS` → `DISMISSED`; action khác → `RESOLVED`. Decide lần hai → `409`.

### Admin content

```http
GET  /api/v1/admin/content?type=POST|COMMENT|STORY&q=&state=VISIBLE|HIDDEN|ALL&page=&size=
GET  /api/v1/admin/content/{type}/{id}
POST /api/v1/admin/content/{type}/{id}/moderate
Body: { action: HIDE|RESTORE, reasonCode, note }
```

- `HIDE`: `MODERATOR` + `ADMIN`; `RESTORE`: `ADMIN`.
- Ẩn comment cập nhật `commentsCount` (clamp ≥ 0) và evict cache.
- Không hard-delete, không xóa media S3.

### Admin audit & stats

```http
GET /api/v1/admin/audit-logs?actorId=&action=&targetType=&targetId=&from=&to=&page=&size=
GET /api/v1/admin/stats/overview?days=7
```

```json
{
  "totalUsers": 123,
  "newUsers": 12,
  "newPosts": 34,
  "reports": { "open": 5, "claimed": 2, "resolved": 18, "dismissed": 3 },
  "processedByDay": [{ "date": "2026-10-17", "resolved": 4, "dismissed": 1 }],
  "avgResolutionHours": 6.4
}
```

- `avgResolutionHours` chỉ tính report đã quyết định; không có dữ liệu → `null`.
- Group theo ngày `Asia/Ho_Chi_Minh`; backend trả đủ `days` ngày kể cả ngày 0.
- Không DAU/MAU, không login events.

### Lỗi

| HTTP | Code |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_TARGET_TYPE`, `INVALID_ACTION` |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`, `ACCOUNT_RESTRICTED` |
| 404 | `TARGET_NOT_FOUND`, `REPORT_NOT_FOUND`, `USER_NOT_FOUND` |
| 409 | `LAST_ADMIN`, `REPORT_ALREADY_EXISTS`, `REPORT_ALREADY_CLAIMED`, `REPORT_ALREADY_DECIDED`, `REPORT_RATE_LIMIT` |

## 6. Luồng kiểm duyệt

```
OPEN --claim--> CLAIMED --decide--> RESOLVED | DISMISSED
```

- Không reopen trong MVP.
- Restore content/user không đổi trạng thái report; ghi audit đảo ngược.
- Appeals V2 tham chiếu `reports.id` / `audit_logs.id`.

### Audit actions

`REPORT_CLAIM`, `REPORT_DECIDE`, `CONTENT_HIDE`, `CONTENT_RESTORE`, `USER_SUSPEND`,
`USER_BAN`, `USER_RESTORE`, `ACCOUNT_SUSPENSION_EXPIRED`, `ROLE_BOOTSTRAP`.

Một command = một audit row. Lý do bắt buộc trừ auto-expiry. Audit cùng transaction
với thay đổi; notification best-effort sau commit.

### Notification

- Thêm `NotificationType.MODERATION`.
- Gửi cho chủ nội dung/tài khoản khi bị ẩn, gỡ, đình chỉ, ban, khôi phục.
- Actor = admin/moderator; post nullable.
- Lỗi gửi chỉ log, không rollback quyết định.

## 7. Frontend

### Route

```
/admin                     Tổng quan
/admin/reports             Queue
/admin/reports/:id         Chi tiết + quyết định
/admin/users               Danh sách
/admin/users/:id           Chi tiết
/admin/content             Post/Comment
/admin/audit-logs          Chỉ ADMIN
```

- Bọc `/admin` trong `AdminRoute`: kiểm tra đăng nhập + roles; chưa đăng nhập → `/login`, không phải staff → `/user/home`.
- Sidebar nhóm: Tổng quan; Kiểm duyệt (Báo cáo, Nội dung); Người dùng; Nhật ký (ADMIN).
- Không có Settings/System/Appeals trong MVP.
- Xóa route admin cũ `/admin/manager-*` và component admin cũ.

### Màn hình

**Dashboard:** 5 KPI + bar chart report đã xử lý theo ngày + top reason. Không fake số.

**Reports:** mặc định `OPEN`, sort cũ nhất trước; cột target preview, reason, reporter,
tuổi report, assignee, status. Filter server-side.

**Report detail:** nội dung 2fr + panel quyết định 1fr sticky; panel hiển thị action
hợp lệ, lý do, hậu quả, nút xác nhận. Quyết định hiện tại hiển thị dưới nội dung.

**Users:** search server-side, filter status/role, pagination; email mask với MOD.
Detail có status card, hành động, nội dung, report, audit.

**Content:** tabs Post/Comment/Story; search/filter state; hide/restore kèm lý do. Không xóa.

**Audit:** read-only, filter actor/action/target/date, expand metadata.

### Trạng thái UI

- Loading bar phẳng, empty state rõ, error có "Thử lại".
- Confirm modal cho mọi action phá hủy/gỡ/khôi phục/ban; lý do bắt buộc.
- Toast kết quả; lỗi hiển thị trong modal.
- Tài khoản bị hạn chế: banner trạng thái; backend chặn mọi request ghi, UI vẫn hiển thị lỗi nếu cố thao tác.
- i18n đủ `vi` + `en`.

## 8. Test tối thiểu

- 401/403/200 cho từng endpoint admin với `USER`, `MODERATOR`, `ADMIN`.
- `MODERATOR` không ban/restore/audit; `ADMIN` được; `USER` không vào dashboard.
- User thường không tự gán role.
- Ban admin cuối → `409 LAST_ADMIN`; tự ban mình → 403.
- Suspend hết hạn → tự `ACTIVE`, audit system; quyền ghi mở lại.
- SUSPENDED/BANNED: post/comment/like/follow/DM/profile edit 403; GET được; DM history còn.
- Ẩn user: feed/profile/search không còn nội dung; restore hiện lại; nội dung `HIDDEN` riêng vẫn ẩn.
- Report target sai/không tồn tại → 404/400; self-report → 403; trùng → 409; quá 10/ngày → 409.
- Claim đồng thời: một thắng, một 409; không claim/decide report của mình.
- Decision thiếu lý do → 400; decide lần hai → 409; action sai target → 400.
- Hide/restore: cache evict; comment count đúng; audit có row.
- Audit + action + report state cùng transaction; lỗi rollback.
- Notification `MODERATION` cho chủ nội dung/user; lỗi notification không rollback.
- Dashboard khớp fixture; avg null khi chưa có report xử lý.
- Frontend `AdminRoute` chặn USER; build pass; i18n đủ vi/en.

## 9. Ngoài scope MVP

Appeals, report story, DAU/MAU, login events, role UI, permission table, system health,
bulk actions, moderator reassignment, email notification, S3 cleanup, full-text search,
hard delete user/content, chart library.
