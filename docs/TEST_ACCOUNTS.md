# Danh sách tài khoản Demo (Test Accounts)

Tài liệu này liệt kê tất cả các tài khoản được tạo sẵn trong hệ thống để phục vụ mục đích kiểm thử và phát triển.

## 🔑 Thông tin chung
- **Mật khẩu dùng chung cho mọi tài khoản demo:** `InstagramDemo!2026`
- **Môi trường áp dụng:** Dữ liệu được nạp thông qua script `backend_instagram/seed-demo.sql`.

## 👥 Chi tiết tài khoản

### 🛡️ Tài khoản đặc quyền (Admin & Moderator)
Dùng để kiểm tra các tính năng quản trị tại đường dẫn `/admin` và luồng xử lý báo cáo.

| Email | Nickname | Tên hiển thị | Vai trò | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `admin@instagram.local` | `admin` | Demo Admin | `ADMIN` + `USER` | Toàn quyền hệ thống, xem audit log, quản lý tài khoản. |
| `moderator@instagram.local` | `moderator_demo` | Demo Moderator | `MODERATOR` + `USER` | Kiểm duyệt nội dung, xử lý báo cáo (Reports). |

### 👤 Tài khoản người dùng (Regular Users)
Dùng để kiểm tra các tính năng mạng xã hội: Feed, Story, Chat, Follow, Like, Comment.

| Email | Nickname | Tên hiển thị | Sở thích/Phong cách |
| :--- | :--- | :--- | :--- |
| `linh@instagram.local` | `linh_demo` | Linh Nguyen | Tài khoản user chính cho testing. |
| `minh@instagram.local` | `minh_demo` | Minh Tran | Tài khoản user. |
| `an@instagram.local` | `an_traveler` | An Nguyen | Du lịch, khám phá ✈️☕ |
| `hoa@instagram.local` | `hoa_designer` | Hoa Dang | Thiết kế sản phẩm, Visual Creator 🎨✨ |
| `duc@instagram.local` | `duc_coder` | Duc Hoang | Lập trình viên, Spring Boot & React 💻☕ |
| `mai@instagram.local` | `mai_foodie` | Mai Le | Ẩm thực, Street food 🍜🍰 |
| `phuong@instagram.local` | `phuong_film` | Phuong Vu | Nhiếp ảnh phim, Street memories 🎞️📸 |
| `quang@instagram.local` | `quang_fitness` | Quang Pham | Fitness, Healthy lifestyle 🏋️‍♂️🥗 |
| `lan@instagram.local` | `lan_artist` | Lan Tran | Digital art, Sketching 🖌️🌸 |
| `nam@instagram.local` | `nam_music` | Nam Vo | Sản xuất âm nhạc, Vinyl collector 🎧🎵 |
| `thu@instagram.local` | `thu_books` | Thu Ha | Yêu sách, Đọc sách chiều 📚☕ |
| `bao@instagram.local` | `bao_arch` | Bao Dang | Kiến trúc, Urban lines 🏛️📐 |

## 🛠️ Kịch bản kiểm thử gợi ý
1. **Luồng Quản trị:** Đăng nhập `admin@instagram.local` $\rightarrow$ Truy cập `/admin` $\rightarrow$ Kiểm tra Audit Log $\rightarrow$ Thử Ban/Unban một user khác.
2. **Luồng Kiểm duyệt:** Đăng nhập `moderator@instagram.local` $\rightarrow$ Truy cập `/admin` $\rightarrow$ Vào mục Reports $\rightarrow$ Xử lý các báo cáo nội dung vi phạm.
3. **Luồng Tương tác:** Đăng nhập `linh@instagram.local` $\rightarrow$ Tìm kiếm `an_traveler` $\rightarrow$ Follow $\rightarrow$ Like bài viết $\rightarrow$ Gửi tin nhắn chat.
4. **Luồng Feed & Story:** Đăng nhập bất kỳ tài khoản nào $\rightarrow$ Theo dõi nhiều tài khoản khác nhau $\rightarrow$ Kiểm tra thanh Story và Feed xem nội dung từ các user khác có hiển thị đúng không.
