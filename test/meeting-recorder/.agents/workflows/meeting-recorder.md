---
description: Quy trình phát triển và kiểm thử Chrome Extension Meeting Recorder
---

# Quy trình (Workflow) phát triển Meeting Recorder

Quy trình này hướng dẫn cách cài đặt, phát triển thêm và kiểm thử tiện ích mở rộng Meeting Recorder.

## 1. Cài đặt môi trường phát triển
1. Mở trình duyệt Chrome.
2. Truy cập vào địa chỉ `chrome://extensions/`.
3. Bật chế độ **Developer mode** ở góc trên bên phải.
4. Nhấn **Load unpacked** và chọn thư mục `z:\home\trong\test\meeting-recorder`.

## 2. Quy trình làm việc hàng ngày
1. **Chỉnh sửa Code**: Thực hiện các thay đổi trong `sidepanel.js` hoặc `sidepanel.css`.
2. **Cập nhật Tiện ích**: Mỗi khi thay đổi code, quay lại trang `chrome://extensions/` và nhấn biểu tượng **Reload** (mũi tên xoay) trên thẻ của tiện ích.
3. **Mở Side Panel**: Click vào icon của extension trên thanh công cụ để mở giao diện ghi âm.

## 3. Kiểm thử tính năng
- **Kiểm tra Microphone**: Đảm bảo trình duyệt đã được cấp quyền truy cập Mic.
- **Ghi âm**: Nhấn "Bắt đầu ghi" và nói thử vài câu. Văn bản sẽ xuất hiện kèm mốc thời gian.
- **Dừng**: Nhấn "Dừng ghi" để kết thúc phiên.
- **Xuất file**: Nhấn "Xuất .txt" và kiểm tra nội dung file tải về có khớp với nội dung đã ghi không.

- **Ghi âm trong Google Meet**: Một tính năng đặc biệt của tiện ích là khả năng ghi lại lời nói của người khác. Để thực hiện, hãy nhấn nút "Bật phụ đề" (Captions) trong giao diện Google Meet. Tiện ích sẽ bắt đầu quét và hiển thị nội dung đó trên Side Panel.

## 4. Xử lý lỗi thường gặp
- **Lỗi 'not-allowed'**: Do chưa cấp quyền Mic. Hãy click vào icon ổ khóa trên thanh địa chỉ và chọn 'Allow' cho Microphone.
- **Lỗi không nhận diện**: Kiểm tra kết nối Internet (Web Speech API của Chrome cần Internet để hoạt động tốt nhất).
