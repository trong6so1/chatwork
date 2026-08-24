---
description: Xây dựng và Triển khai Chrome Extension với Plasmo (Tiếng Việt)
---

# Workflow: Phát triển Extension với Plasmo

Tài liệu này hướng dẫn các bước để phát triển và triển khai một Chrome Extension bằng framework Plasmo và dịch vụ Itero.

1. **Khởi tạo dự án**
   - Chạy lệnh `npx create-plasmo@latest <project-name>` để tạo dự án mới.
   - Ưu tiên chọn React/TypeScript để có trải nghiệm phát triển tốt nhất.

2. **Triển khai Logic hệ thống**
   - Sử dụng `content.ts` để tương tác trực tiếp với DOM của trang web và trích xuất dữ liệu.
   - Sử dụng `popup.tsx` để xây dựng giao diện người dùng cho extension.
   - Giao tiếp giữa Popup và Content Script thông qua `chrome.runtime.sendMessage`.

3. **Thiết kế Giao diện (Styling)**
   - Tạo file `popup.css` và import vào `popup.tsx`.
   - Sử dụng các phong cách thiết kế hiện đại như Gradient, Glassmorphism để tạo cảm giác cao cấp.

// turbo
4. **Triển khai lên Itero**
   - Tạo GitHub Action trong thư mục `.github/workflows/submit.yml`.
   - Cấu hình `ITERO_TOKEN` trong phần Secrets của GitHub Repository.
   - Chỉ cần Push code lên nhánh `main` để kích hoạt quy trình triển khai tự động.

5. **Kiểm thử và Xác nhận**
   - Sử dụng `pnpm dev` để chạy chế độ phát triển cục bộ.
   - Kiểm tra bảng điều khiển của Itero để xác nhận phiên bản đã được tải lên thành công.
