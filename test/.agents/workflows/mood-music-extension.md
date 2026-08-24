---
description: Quy trình phát triển Mood Music Chrome Extension
---

# Quy trình phát triển Mood Music Chrome Extension

Quy trình này hướng dẫn bạn cách xây dựng, tùy chỉnh và cài đặt extension gợi ý nhạc theo tâm trạng.

## Phase 1: Thiết kế và Cấu trúc (Manifest V3)
1. Tạo thư mục `mood-music-extension`.
2. Tạo file `manifest.json` định nghĩa các quyền (permissions):
   - `tabs`: Để mở tab mới trên YouTube.
   - `action`: Định nghĩa popup mặc định (`popup.html`).

## Phase 2: Phát triển Giao diện (Premium UI)
1. Thiết kế `popup.html` với cấu trúc:
   - Header: Tiêu đề và slogan.
   - Input Group: `select` cho Tâm trạng (Mood) và Thể loại (Genre).
   - Button: Nút "Bắt đầu phát" với icon SVG.
2. Styling chuyên sâu trong `style.css`:
   - Sử dụng **Glassmorphism** (nền mờ, viền mảnh).
   - Tông màu Dark mode cao cấp (`#0f172a`).
   - Hiệu ứng Gradient cho tiêu đề và nút bấm.
   - Đảm bảo font chữ hiện đại (Outfit từ Google Fonts).

## Phase 3: Logic Nghiệp vụ (Search Mapping)
1. Phát triển `popup.js`:
   - Lắng nghe sự kiện `DOMContentLoaded`.
   - Lấy giá trị từ hai dropdown menu.
   - Xây dựng chuỗi tìm kiếm (Query): `{mood} {genre} music playlist`.
   - Sử dụng `chrome.tabs.create` để chuyển hướng người dùng đến trang kết quả tìm kiếm YouTube.

## Phase 4: Cài đặt và Kiểm thử
1. Mở Chrome và đi tới `chrome://extensions`.
2. Kích hoạt **Developer mode** (Chế độ nhà phát triển) ở góc trên bên phải.
3. Nhấp vào **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục `mood-music-extension`.
5. Ghim Extension lên thanh công cụ và trải nghiệm.

## Ghi chú mở rộng
- Bạn có thể thêm nhiều "Tâm trạng" hoặc "Thể loại" hơn bằng cách thêm thẻ `<option>` trong `popup.html`.
- Cơ chế tìm kiếm có thể được nâng cấp bằng cách sử dụng YouTube API để phát trực tiếp một playlist cụ thể thay vì trang tìm kiếm.
