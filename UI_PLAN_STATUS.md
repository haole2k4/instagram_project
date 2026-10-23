# Trạng thái kế hoạch UI

Cập nhật: 2026-10-23. Nguồn: `ART_DIRECTION.md` và kế hoạch UI 8 bước đã chốt.

## Đã xong

- **Bước 0 — Design tokens + base style**: token `ig.*`, font system, radius, easing/duration; dark body, selection, focus-visible, hover gating, reduced-motion, `.no-scrollbar`.
- **Bước 1 — Shell + điều hướng**: rail 72px, bottom bar mobile 4 mục, logo glyph outline, active/unread state, tooltip + `aria-label`; search panel, More/Create/Language, offset shell và chat.
- Trạng thái: nằm trong **PR #10** (`feature/ui-foundation`), chưa merge tại thời điểm viết.

## Chưa hoàn thiện

### Bước 2 — Stories

- [ ] Story bar: bỏ `w-[50vw]`, `bg-sky-700`, `hover:scale-105`; cho bar rộng đúng cột feed, ring gradient Instagram là gradient duy nhất, trạng thái đã xem dùng ring tối + giảm opacity.
- [ ] Avatar story 56–72px, tên 12px meta; hover `scale(1.04)` 160ms chỉ khi `hover: hover` + `pointer: fine`; reduced-motion bỏ scale.
- [ ] Story viewer: nền `#000`, progress bar dùng `transform: scaleX` (không animate `width`), header 56–72px, menu `bg-ig-raised` thay menu trắng/`text-red-600`.
- [ ] Story create: bỏ gradient xanh–indigo và `transition-all`; dùng `ig.accent` cho một control chính.
- [ ] Key i18n cho toàn bộ label story (vi + en).

### Bước 3 — Feed + Home

- [ ] `Home` đang `max-w-7xl`: đưa về cột giữa tối đa 630px, bài 470px, gutter 24–32px; thêm `h1` `sr-only` "Trang chủ".
- [ ] `Fragment`/`Home` bỏ `bg-black`, `px-3` tuỳ tiện; thống nhất trục trái và mép phải.
- [ ] Post card (`NewsFeedCart`, `ModalCart`): bỏ `w-[35vw]`, `border-gray-700`, `text-gray-400`, `bg-opacity`, `shadow-lg` trên thẻ tĩnh, `hover:scale-110`, `text-red-500`.
- [ ] Chuẩn hoá media 1:1/4:5, action icon lucide 24px, liked chỉ dùng `ig.like`; username 14/600, caption 14, meta 12; số đếm `tabular-nums`.
- [ ] Create post: bỏ `bg-[#0e0e0e]`, `bg-blue-600`, focus xanh, `transition`; modal 200ms `scale(.97)` center, đóng bằng Escape/click ngoài.
- [ ] Like: tim pop 200ms `0.9 → 1`; double-tap overlay 300–400ms rồi fade; reduced-motion chỉ đổi màu/opacity.

### Bước 4 — Cột phải

- [ ] `RecommendUser`: `lg:w-[20vw] w-full h-[80vh]` → cột 320px sticky; ẩn dưới 1280px; 768–1279px chỉ rail + feed.
- [ ] Bỏ card `bg-black shadow-md border-gray-800 rounded-md`; dùng bề mặt phẳng, không shadow trên thứ đứng yên.
- [ ] **Không lộ email** (`userApp.userInfo?.email`) và không footer link chết; chỉ hiển thị dữ liệu có thật.
- [ ] Thay `text-blue-400`, `text-gray-500`, `scrollbar-thin` bằng token `ig.*`; Follow là một control chính, không gradient.

### Bước 5 — AI trong chat

- [ ] Thêm route/view `/user/chat/ai`; đưa lối vào AI vào khung Chat (header hoặc danh sách cuộc trò chuyện).
- [ ] Xoá nút nổi `ChatAI` và comment tạm trong `DefaultLayout`; xoá style xanh `bg-blue-500`.
- [ ] Chat surface dùng `ig.surface`, row 56–72px, unread dot, input nằm trên bottom bar mobile.
- [ ] Typing indicator 3 chấm 1.2s; reduced-motion thay bằng chữ "Đang trả lời…".
- [ ] Tin nhắn mới: opacity + `translateY(6px)`, 180ms; lịch sử AI ghép ở client, backend `/chat` không đổi.

### Bước 6 — Loading / empty states

- [ ] Thay spinner ở `ConversationList`, `MessageList`, `UserSearchModal` (và các chỗ còn lại) bằng bar xám phẳng đúng kích thước; không shimmer, layout không nhảy.
- [ ] Empty state cho feed, search không có kết quả, chat chưa có hội thoại, notifications, stories, lỗi tải.
- [ ] Bỏ "Loading..." / "Error!" dạng text thô; dùng khối 16px + mô tả 14px.
- [ ] Kiểm tra mạng chậm (3G) để chắc layout không nhảy khi data về.

### Bước 7 — Motion, i18n, a11y

- [ ] Rà `transition-all`, `hover:scale` trên phần tử tĩnh; press `scale(.97)` 120ms, hover 120–160ms, chỉ fine pointer.
- [ ] Reduced-motion cho toàn bộ: bỏ transform/di chuyển, giữ opacity/màu; smooth scroll → `auto`.
- [ ] Quét label hardcode trong feed/story/chat/notification/error; thêm key vi + en; thống nhất date/time.
- [ ] Mỗi màn hình đúng một `h1`; icon-only có tooltip + `aria-label`; dialog/menu có focus trap, Escape, đóng khi click ngoài.
- [ ] Thay icon `react-icons` còn lại bằng lucide; không emoji trong UI.
- [ ] Rà alt text, contrast, focus-visible và kích thước hit target mobile.

## Lỗ hổng đã biết (cần quyết định)

- **Mobile không có settings/language/logout**: `MoreMenu` chỉ nằm trong rail desktop; bottom bar cố định 4 mục theo ART. Cần chọn: thêm mục thứ 5, đưa vào trang Profile, hoặc trang Settings riêng.
- **Mobile không có Create/Notifications**: bottom bar theo ART chỉ có Home/Search/Messages/Profile; hiện Create chỉ dùng được trên desktop.
- **Auth/register/admin vẫn nền sáng**: PR #10 giữ nguyên để không làm mất chữ; ART ghi "toàn app `#000`". Cần quyết định darken hay ghi nhận ngoại lệ.
- **`/user/search` không render gì**: `Pages/Search/Search.jsx` gọi `SearchBar` không truyền `isOpen`; nav cũng không còn link tới route này. Nên xoá route/page hoặc cho nó render panel.
- **Rail dùng icon 24px**: khác rule "icon outline 16px" trong ART (đang hiểu 16px là icon nội dung); cần xác nhận.
- **Nút nổi ChatAI**: đã hạ z-index và nâng lên trên bottom bar mobile, nhưng vẫn là nút nổi tạm thời; xoá ở bước 5.
- **Scrollbar**: đã bỏ ẩn scrollbar toàn cục, chỉ còn `.no-scrollbar`; hiện scrollbar native có thể xuất hiện. Cần xác nhận có giữ không.
- **Không có test UI tự động**: mới kiểm tra `pnpm build` + eslint; chưa smoke-test shell sau đăng nhập vì cần backend/auth. Chỉ đã chụp `/login`.

## Cách kiểm tra sau mỗi bước

```bash
cd Social-app-fontend
pnpm build
```

- Chạy stack (`docker compose up --build -d` hoặc `make k8s-up`) để smoke-test luồng có auth.
- Kiểm tra 3 breakpoint: <768px, 768–1279px, ≥1280px.
- Kiểm tra `prefers-reduced-motion: reduce` và bàn phím (Tab, Escape, focus ring).
