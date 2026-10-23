# Trạng thái kế hoạch UI

Cập nhật: 2026-10-23. Nguồn: `ART_DIRECTION.md` và kế hoạch UI 8 bước đã chốt.

## Đã xong

- **Bước 0 — Design tokens + base style**: token `ig.*`, font system, radius, easing/duration; dark body, selection, focus-visible, hover gating, reduced-motion, `.no-scrollbar`.
- **Bước 1 — Shell + điều hướng**: rail 72px, bottom bar mobile 4 mục, logo glyph outline, active/unread state, tooltip + `aria-label`; search panel, More/Create/Language, offset shell và chat.
- **Bước 2 — Stories**:
  - [x] Story bar: bỏ `w-[50vw]`, `bg-sky-700`, `hover:scale-105`; cho bar rộng đúng cột feed, ring gradient Instagram là gradient duy nhất (`.ig-ring-story`), trạng thái đã xem dùng ring tối + giảm opacity.
  - [x] Avatar story 56–72px (`64px`), tên 12px meta; hover `scale(1.04)` 160ms chỉ khi `hover: hover` + `pointer: fine`; reduced-motion bỏ scale.
  - [x] Story viewer: nền `#000`, progress bar dùng `transform: scaleX` (không animate `width`), header 56–72px, menu `bg-ig-raised` thay menu trắng/`text-red-600`, hoạt động đầy đủ nút tạm dừng và tắt/bật âm.
  - [x] Story create: bỏ gradient xanh–indigo và `transition-all`; dùng `ig.accent` cho một control chính.
  - [x] Key i18n cho toàn bộ label story (`vi` + `en`).
- **Bước 3 — Feed + Home**:
  - [x] `Home` đưa về cột giữa tối đa `630px`, bài `470px`, gutter `32px`; thêm `h1` `sr-only` "Trang chủ" và header mobile cho Tạo mới + Thông báo.
  - [x] `Fragment`/`Home` bỏ `bg-black`, `px-3` tuỳ tiện; thống nhất trục trái và mép phải.
  - [x] Post card (`NewsFeedCart`, `ModalCart`): bỏ `w-[35vw]`, `border-gray-700`, `text-gray-400`, `bg-opacity`, `shadow-lg` trên thẻ tĩnh, `hover:scale-110`, `text-red-500`.
  - [x] Chuẩn hoá media 1:1/4:5, action icon `lucide-react` 24px, liked chỉ dùng `ig.like`; username 14/600, caption 14, meta 12; số đếm `tabular-nums`.
  - [x] Create post: bỏ `bg-[#0e0e0e]`, `bg-blue-600`, focus xanh, `transition`; modal 200ms `scale(.97)` center, đóng bằng Escape/click ngoài.
  - [x] Like: tim pop 200ms `0.9 → 1`; double-tap overlay 300–400ms rồi fade; reduced-motion chỉ đổi màu/opacity.
- **Bước 4 — Cột phải**:
  - [x] `RecommendUser`: cột `320px` sticky; chỉ hiển thị tại `/user/home` và ẩn dưới `1280px` (`hidden xl:block`); `768–1279px` chỉ rail + feed.
  - [x] Bỏ card `bg-black shadow-md border-gray-800 rounded-md`; dùng bề mặt phẳng, không shadow trên thứ đứng yên.
  - [x] **Không lộ email** (`userApp.userInfo?.email`) và không footer link chết; chỉ hiển thị dữ liệu có thật.
  - [x] Thay `text-blue-400`, `text-gray-500`, `scrollbar-thin` bằng token `ig.*`; Follow là một control chính, không gradient.
- **Bước 5 — AI trong chat**:
  - [x] Thêm route/view `/user/chat/ai` (`AIChatPanel`); đưa lối vào AI cố định vào đầu danh sách cuộc trò chuyện trong khung Chat.
  - [x] Xoá nút nổi `ChatAI` và comment tạm trong `DefaultLayout`; xoá style xanh `bg-blue-500`.
  - [x] Chat surface dùng `ig.surface`, row 64px (56–72px), unread dot `#ff3040`, input nằm trên bottom bar mobile.
  - [x] Typing indicator 3 chấm 1.2s; reduced-motion thay bằng chữ "Đang trả lời…".
  - [x] Tin nhắn mới: opacity + `translateY(6px)`, 180ms; lịch sử AI ghép ở client, backend `/chat` không đổi.
- **Bước 6 — Loading / empty states**:
  - [x] Thay toàn bộ spinner ở `ConversationList`, `MessageList`, `UserSearchModal`, `RouterApp`, `NewsFeedCart`, `Stories`, `RecommendUser`, `Notifications` bằng bar xám phẳng (`FlatSkeleton`) đúng kích thước; không shimmer, layout không nhảy.
  - [x] Empty state (`EmptyState`) cho feed, search không có kết quả, chat chưa có hội thoại, notifications, stories, profile, lỗi tải.
  - [x] Bỏ "Loading..." / "Error!" dạng text thô; dùng khối 16px + mô tả 14px.
- **Bước 7 — Motion, i18n, a11y**:
  - [x] Rà và xoá `transition-all`, `transition-[width]`, `transition-[padding]`, `hover:scale` trên phần tử tĩnh; press `scale(.97)` 120ms, hover 120–160ms chỉ fine pointer.
  - [x] Reduced-motion cho toàn bộ: bỏ transform/di chuyển, giữ opacity/màu; smooth scroll → `auto`.
  - [x] Quét label hardcode trong feed/story/chat/notification/auth/profile; thêm key `vi` + `en`; thống nhất date/time.
  - [x] Mỗi màn hình đúng một `h1`; icon-only có tooltip + `aria-label`; dialog/menu có Escape và đóng khi click ngoài.
  - [x] Thay toàn bộ icon `react-icons` còn lại bằng `lucide-react`; không emoji trong UI.
  - [x] Chuẩn hoá mobile-native (`viewport-fit=cover`, `theme-color`, `-webkit-tap-highlight-color`, `touch-action: manipulation`, font-size input 16px trên mobile).

## Các quyết định đã chốt cho lỗ hổng trước đó

- **Mobile settings/language/logout & Create/Notifications**: Giữ nguyên bottom bar 4 mục theo `ART_DIRECTION.md`; bổ sung thanh header mobile trên `Home` (Tạo mới + Thông báo) và nút Menu (`MoreMenu`) trên header `UserProfile` ở mobile.
- **Auth/register nền tối**: Đưa `/login` và `/register` về nền `#000000` (`bg-ig-ground`), thẻ `#111111` (`bg-ig-surface`), viền `#1a1a1a` (`border-ig-border`), bỏ link chết `"Quên mật khẩu?"`.
- **`/user/search`**: Render `SearchPanel` trực tiếp với `isOpen={true}` và điều hướng về `/user/home` khi đóng.
- **Nút nổi ChatAI**: Đã xoá hoàn toàn file `Components/ChatAI/ChatAI.jsx` và tích hợp vào `/user/chat/ai`.

## Cách kiểm tra

```bash
cd Social-app-fontend
pnpm build
```

- Chạy stack (`docker compose up --build -d` hoặc `make k8s-up`) để smoke-test luồng có auth.
- Kiểm tra 3 breakpoint: <768px, 768–1279px, ≥1280px.
- Kiểm tra `prefers-reduced-motion: reduce` và bàn phím (Tab, Escape, focus ring).
