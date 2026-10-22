# ART_DIRECTION.md

Hướng thẩm mỹ đã chốt cho giao diện trong `Social-app-fontend`. Đọc file này trước khi thiết kế, thêm hoặc sửa bất kỳ màn hình/component UI nào. Phạm vi sản phẩm và cách chạy nằm ở `README.md`; file này chỉ giữ phần art direction.

## Design read

App mạng xã hội media-first cho người dùng phổ thông đọc feed hằng ngày trên desktop và điện thoại. Vibe true-black yên tĩnh: ảnh là nhân vật chính, toàn bộ chrome (nav, rail, metadata) lùi về sau — không phải dashboard, không phải landing page.

Style gốc: Taste Skill `true-black-flat` (seed 396774925), giữ nguyên move "phân tầng bằng độ sáng, màu chỉ nằm trên dữ liệu và hành động". Đã redraw có lý do: shell → icon rail (media-first, giữ width cho feed), palette → xanh Instagram (brand đã cố định), typeface → system grotesk (brand, không tải webfont).

Câu hỏi của từng màn hình: Home — "Có gì mới từ người mình theo dõi?"; Chat — "Ai đang chờ mình trả lời?"; AI chat — "Mình cần hỏi gì?". Khối lớn nhất trên màn hình luôn là câu trả lời cho câu hỏi đó, không phải tiêu đề hay banner.

## Ba núm vặn

| Núm | Giá trị | Lý do |
| --- | --- | --- |
| `DESIGN_VARIANCE` | 3/10 | App quen thuộc, shell phải ổn định; khác biệt nằm ở nhịp bài và typography, không ở bố cục lạ. |
| `MOTION_INTENSITY` | 3/10 | App screen: chuyển động chỉ để phản hồi (press, hover, like, modal, tin nhắn mới); không có entrance choreography. |
| `VISUAL_DENSITY` | 6/10 | Medium: body 14px, meta 12px, cột bài 470px, row 56–72px; đủ dày để đọc feed, không phải bảng vận hành. |

## Anti-pattern bị cấm

1. Không nền navy/slate (`#0b1014`, `#0f172a`). Nền `#000`, bề mặt `#111`, lớp nổi `#2a2a2a`.
2. Không gradient trên nền, nút, chip, chữ, header, avatar. Ngoại lệ duy nhất: vòng story — brand asset, chỉ ở đúng vòng đó.
3. Không glow, neon, backdrop-blur, glass ở nav, modal, chat.
4. Không shadow trên thứ đứng yên (post, rail, nav); shadow chỉ cho menu, popover, modal.
5. Không icon trong ô tròn tô màu. Avatar là ảnh người; icon là outline 16px, một bộ duy nhất (lucide).
6. Không shimmer gradient khi loading. Dùng bar xám phẳng đúng kích thước, layout không nhảy khi data về.
7. Không entrance animation cho từng post/row/nav; không scroll-reveal, parallax, scroll-jack, bounce/spring trang trí.
8. Không tô accent lên chrome. Nav active bằng độ sáng (`#bbb → #fff`); accent chỉ ở link, một control chính và trạng thái đã like.
9. Không emoji trong UI. Thay bằng icon lucide (khoá, nhóm, quả địa cầu).
10. Không bịa hành vi hoặc dữ liệu: không "Followed by…" khi không có, không footer link chết, không nút "Chuyển" không chức năng, không lộ email, không nút nổi che nội dung.

## Typography

- Một family duy nhất: system grotesk (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`). Không thêm webfont.
- Wordmark "Instagram" giữ asset PNG hiện có, không dùng font để vẽ lại.
- Thang cỡ chữ: 12 / 14 / 16 / 20 / 24.
  - 24: `h1` (ẩn thị giác ở feed), tiêu đề màn Chat.
  - 20: heading khối, dùng hiếm.
  - 16: tên section, empty state.
  - 14: body, username, caption, nav label, nút.
  - 12: meta, timestamp, tên story, footer.
- Weight: 400 / 500 / 600. Không 700 ngoài wordmark.
- Số đếm (like, comment) dùng `tabular-nums`. Sentence case; không uppercase tracked; không chữ dưới 11px.

## Palette

| Vai trò | Giá trị | Dùng ở đâu |
| --- | --- | --- |
| Nền | `#000000` | Toàn app |
| Bề mặt | `#111111` | Panel chat, story bar, input |
| Lớp nổi | `#2a2a2a` | Modal, menu, popover |
| Đường phân cách | `#1a1a1a` / `#161616` | Viền, rule |
| Chữ chính | `#ffffff` | Username, caption, tiêu đề |
| Chữ phụ | `#b4b4b4` | Mô tả, trạng thái |
| Chữ meta | `#949494` | Thời gian, số phụ, footer |
| Nhấn | `#0095f6` | Link, Follow, nút chính, focus ring |
| Liked | `#ff3040` | Chỉ khi người dùng đã like |
| Ngoại lệ brand | gradient Instagram | Chỉ vòng story |

Màu nhấn giữ ở mức ≤ 3% pixel. Không có hue thứ hai ngoài đỏ liked và gradient story.

## Layout

- Shell: rail 72px (mark ở đỉnh, tooltip và `aria-label` cho mọi icon), cột giữa tối đa 630px, bài viết 470px canh giữa trong cột, cột phải 320px sticky. Tổng vùng nội dung khoảng 998px, gutter 24–32px.
- Breakpoint: dưới 768px dùng bottom bar 4 mục (Home, Search, Messages, Profile), margin 16px; 768–1279px rail + feed, ẩn cột phải; từ 1280px đủ ba cột.
- Nhịp: base 4px; padding bài 12–16px; row chat/thông báo 56–72px; khoảng cách section 24–32px; một gap duy nhất cho cả ngang và dọc.
- Mỗi cột có một trục trái; mọi phần tử trong cột kết thúc cùng mép phải. Không card bị kéo cao hơn nội dung, không panel rỗng quá 40px.
- Mỗi màn hình có đúng một `h1`: Home dùng `sr-only` "Trang chủ"; Chat và AI dùng tên cuộc trò chuyện. Không greeting, không "Welcome back".
- Mobile: nav thu thành bottom bar; cột phải chuyển xuống dưới cột chính hoặc vào tab; bảng/list giữ hai dòng thay vì bỏ field.

## Motion

Được phép:

| Trường hợp | Thông số |
| --- | --- |
| Press feedback | `scale(0.97)`, 120ms, `cubic-bezier(.23,1,.32,1)` |
| Hover/focus | màu hoặc opacity 120–160ms; chỉ trong `hover: hover` và `pointer: fine` |
| Like | tim pop 200ms, scale `0.9 → 1` (không bao giờ từ 0) |
| Double-tap like | overlay tim 300–400ms rồi fade out |
| Tin nhắn mới | opacity + `translateY(6px)`, 180ms |
| Modal/menu | vào 200ms, ra 150ms, `scale(.97)`, origin theo trigger (modal: center) |
| Typing indicator | 3 chấm, 1.2s, chỉ khi AI đang trả lời |
| Story ring hover | `scale(1.04)`, 160ms, chỉ hover + fine pointer |

Cấm: entrance/scroll-reveal cho feed, shimmer skeleton, parallax, scroll-jack, animate `width/height/top/left`, `transition: all`, spring bounce, animation cho hành động bàn phím, loop trang trí.

`prefers-reduced-motion`: bỏ mọi transform và di chuyển, giữ opacity/màu; smooth scroll chuyển thành `auto`; typing dots thay bằng chữ "Đang trả lời…".

## Admin surface

Admin là bề mặt vận hành, không phải feed. Giữ palette true-black và system grotesk; mục tiêu là đọc bảng nhanh, thao tác có chủ đích, không phải dashboard trình diễn. Spec chi tiết ở `ADMIN_SPEC.md`.

### Shell

- Desktop ≥1200px: sidebar 240px mở; nút thu gọn còn 64px, chỉ icon + tooltip/aria-label; nhớ trạng thái trong localStorage.
- 768–1199px: mặc định 64px; mở rộng thành overlay 240px khi cần.
- <768px: drawer 280px, mở bằng nút menu; đóng khi chọn route; không che nội dung khi đóng.
- Topbar 56px: breadcrumb + page title; bên phải là trạng thái môi trường và menu tài khoản. Không thêm search toàn cục nếu backend chưa hỗ trợ.
- Nội dung tối đa 1280px, padding 24px (mobile 16px), grid 4px.

### Typography

- 24px page title (đúng một h1), 16px section, 14px body/bảng, 12px meta/header.
- Weight 400/500/600; số dùng `tabular-nums`; text dài truncate 1 dòng + title/tooltip.
- Không uppercase tracked, không chữ dưới 11px.

### Bảng dữ liệu

- Header 40px, row 52px, padding ngang 16px; border-bottom `#161616`; hover `#111`; không zebra, không card shadow.
- Sticky header; sort bằng mũi tên lucide 14px; cột số canh phải.
- Trạng thái: chấm 6px + text, không pill nền màu. `ACTIVE` trắng, `SUSPENDED` xám `#b4b4b4` với chấm rỗng, `BANNED` `#ff3040`.
- Hành động là text button 14px; nguy hiểm dùng `#ff3040`; icon-only phải có tooltip + aria-label.
- Empty state nằm trong bảng, 16px, một câu + hành động nếu có.

### Hành động và form

- Mỗi màn hình tối đa một nút accent chính. Nút phụ viền `#2a2a2a`, nền trong.
- Gỡ/khôi phục/khóa/ban mở modal xác nhận: một câu hậu quả, select lý do, textarea ghi chú, nút xác nhận disabled đến khi hợp lệ. Không dùng `confirm()` mặc định.
- Label trên field, lỗi dưới field 12px; focus ring 2px `#0095f6`.
- Toast cho kết quả; lỗi giữ modal mở và hiển thị cạnh action.

### Report detail

- Hai cột: nội dung 2fr, panel quyết định 1fr sticky trên desktop; mobile xếp dọc, panel thành bottom sheet.
- Snapshot nội dung là trung tâm; metadata phụ. Panel luôn thấy action + lý do + hậu quả.
- Lịch sử/audit nằm dưới nội dung, không giấu trong tab.

### Biểu đồ

- Chỉ bar/line phẳng; một series accent `#0095f6`, series phụ `#2a2a2a`; grid `#161616`; không 3D, donut, rainbow, gradient.
- KPI: số 24/600 + label 12; không icon trang trí.
- Không thêm thư viện chart nếu chỉ cần 1–2 biểu đồ; SVG/CSS đủ.

### Trạng thái và chuyển động

- Loading: bar xám phẳng đúng chiều cao row; không shimmer.
- Empty: câu nói rõ vì sao trống ("Không có báo cáo đang mở").
- Error: câu ngắn + "Thử lại"; không dùng toast thay cho error state.
- Motion 120–160ms, chỉ opacity/màu; không entrance, không parallax.
- `prefers-reduced-motion`: bỏ transform.

### Cấm

- Gradient, glass, glow, neon, shadow tĩnh, icon trong ô tròn tô màu.
- Dashboard nhiều màu, chip trạng thái rực rỡ, emoji.
- Bịa số liệu hoặc hiển thị biểu đồ khi backend không trả.

## Đã chốt — không tự ý thay đổi

- Nền `#000`, accent `#0095f6`, system grotesk; không navy, không Inter.
- Rail 72px icon-only; không đổi sang sidebar 240px có label nếu không có yêu cầu mới.
- Cột 630 / bài 470 / rail phải 320; đúng ba breakpoint ở trên.
- Gradient chỉ tồn tại ở vòng story.
- Loading là bar phẳng, không shimmer; không entrance animation.
- AI chat nằm trong khung chat (`/user/chat/ai`), không có nút nổi; history ghép ở client, backend `/chat` không đổi.
- Không thêm Reels, lưới Khám phá thật, account switcher hay link chết.
- Ngôn ngữ mặc định là tiếng Việt; mọi label mới phải có key ở cả `vi` và `en`.
- Admin dùng sidebar 240px mở / 64px thu gọn / drawer mobile; đây là ngoại lệ có chủ đích so với rail 72px của app.
- Admin dùng bảng mật độ 52px, trạng thái dạng chấm + text; đỏ `#ff3040` được phép cho trạng thái `BANNED` và hành động phá hủy.

## Lịch sử quyết định

- 2026-10-23 — Chốt hướng `true-black-flat` sau Taste Skill review; redraw shell thành icon rail, palette về xanh Instagram, typeface về system grotesk. Đổi nền `#0b1014` thành `#000`, bỏ skeleton shimmer và entrance animation so với plan đầu tiên.
- 2026-10-23 — Chốt admin surface: sidebar 240/64, drawer mobile, bảng 52px, không gradient/chip màu; spec chi tiết ở `ADMIN_SPEC.md`.
