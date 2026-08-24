---
description: Quy trình phát triển Chrome Extension Scheduler
---

# Quy trình phát triển Chrome Extension Scheduler

Quy trình này hướng dẫn từng bước để xây dựng và triển khai extension từ đầu.

## Phase 1: Khởi tạo Project & Manifest

1.  Tạo thư mục dự án: `mkdir redmine-scheduler`.
2.  Tạo file `manifest.json` định nghĩa:
    *   `manifest_version`: 3
    *   `permissions`: ["alarms", "storage", "tabs"]
    *   `background`: service_worker trỏ tới `background.js`
    *   `action`: trỏ tới `popup.html`

## Phase 2: Logic chạy ngầm (Background logic)

1.  Tạo file `background.js`.
2.  Lắng nghe sự kiện `chrome.alarms.onAlarm`.
3.  Khi sự kiện được kích hoạt, kiểm tra tên alarm.
4.  Thực hiện `chrome.tabs.create({ url: '...' })` để mở trang Redmine.

## Phase 3: Giao diện người dùng (User Interface)

1.  Tạo file `popup.html` với form chọn thời gian (input type="datetime-local").
2.  Tạo file `popup.js`:
    *   Lấy giá trị thời gian người dùng nhập.
    *   Tính toán thời gian còn lại (milliseconds).
    *   Sử dụng `chrome.alarms.create` để tạo báo thức.
    *   Lưu thông tin vào `chrome.storage` để hiển thị trạng thái hiện tại.

## Phase 4: Kiểm thử & Phân phối

1.  Mở Chrome, truy cập `chrome://extensions`.
2.  Bật "Developer mode".
3.  Chọn "Load unpacked" và trỏ tới thư mục `redmine-scheduler`.
4.  Mở popup và test tính năng đặt lịch.
5.  Nén thư mục thành file `.zip` để chuẩn bị upload lên Chrome Web Store.
