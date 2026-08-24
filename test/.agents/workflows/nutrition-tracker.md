---
description: Quy trình phát triển Hệ thống Quản lý và Theo dõi Dinh dưỡng Giảm cân
---

# Quy trình phát triển Hệ thống Quản lý và Theo dõi Dinh dưỡng

Quy trình này hướng dẫn chi tiết các bước thiết lập, phát triển và tích hợp chức năng cho ứng dụng theo dõi dinh dưỡng, xuất báo cáo và đề xuất kế hoạch tuần tiếp theo.

## Phase 1: Phân tích kiến trúc & Lưu trữ dữ liệu
1. **Mô hình SPA (Single Page Application):** Sử dụng cấu trúc thư mục phẳng, dễ quản lý:
   - `nutrition-tracker/index.html` - Giao diện cốt lõi.
   - `nutrition-tracker/css/style.css` - Giao diện Glassmorphism Dark Mode.
   - `nutrition-tracker/js/food-db.js` - Danh mục món ăn mặc định.
   - `nutrition-tracker/js/app.js` - Logic xử lý trung tâm.
2. **Lưu trữ dữ liệu:**
   - Sử dụng `localStorage` để lưu trữ ngoại tuyến 4 nhóm dữ liệu chính:
     - `personalInfo`: Cân nặng, chiều cao, tuổi, giới tính, mức độ vận động và TDEE.
     - `foodLog`: Danh sách thực phẩm đã ăn theo từng ngày (`YYYY-MM-DD`).
     - `inbodyHistory`: Lịch sử các lần cập nhật chỉ số InBody (Cân nặng, % mỡ, cơ xương).
     - `lineConfig`: Token LINE Notify và trạng thái cấu hình.

## Phase 2: Thiết lập Cơ sở dữ liệu Thực phẩm
1. Xây dựng thư viện món ăn Việt Nam trong `food-db.js`:
   - Phân loại rõ ràng: Món ăn chính, món ăn nhẹ, trái cây, thực phẩm thô.
   - Mỗi món ăn có các trường: `name` (Tên món), `calories` (Kcal), `unit` (Đơn vị tính: 100g, bát, đĩa, cái).
2. Viết các hàm hỗ trợ tra cứu nhanh (Auto-complete) trong ô nhập thực phẩm của người dùng.

## Phase 3: Thiết kế Giao diện (Premium Dark Theme)
1. Cấu hình bảng màu chuẩn tại `style.css` sử dụng CSS Variables:
   - Nền tối cao cấp: `--bg-dark: #0b0f19` và `--bg-card: rgba(30, 41, 59, 0.45)`.
   - Màu nhấn ấn tượng: `--accent-primary: #6366f1` (Indigo), `--accent-success: #10b981` (Emerald), `--accent-warning: #f59e0b` (Amber).
   - Glassmorphism: Sử dụng `backdrop-filter: blur(16px)` và viền mỏng `border: 1px solid rgba(255, 255, 255, 0.08)`.
2. Tạo bố cục Tabbed navigation mượt mà:
   - **Nhật ký:** Nơi ghi nhận đồ ăn kèm vòng tròn tiến độ Calorie bằng SVG sống động.
   - **InBody:** Form nhập chỉ số cơ thể và biểu đồ xu hướng.
   - **Đề xuất:** Xem kế hoạch dinh dưỡng tuần tiếp theo.
   - **LINE & Báo cáo:** Tải file Excel và cấu hình gửi tin nhắn.
   - **Cài đặt:** Quản lý thông tin cơ bản.

## Phase 4: Logic nghiệp vụ & Đề xuất Calories tuần tiếp theo
1. **Tính toán BMR & TDEE:** Áp dụng công thức Mifflin-St Jeor:
   - Nam: $BMR = (10 \times weight) + (6.25 \times height) - (5 \times age) + 5$
   - Nữ: $BMR = (10 \times weight) + (6.25 \times height) - (5 \times age) - 161$
   - $TDEE = BMR \times ActivityMultiplier$
2. **Theo dõi chỉ số InBody (Chủ nhật hàng tuần):**
   - Lưu trữ các chỉ số: Ngày đo, Cân nặng (kg), Tỷ lệ mỡ (%), Tỷ lệ cơ xương (%).
   - Tự động hiển thị lời nhắc cập nhật chỉ số mới nếu hôm nay là Chủ Nhật.
3. **Thuật toán Đề xuất tuần tiếp theo (Calorie Cycling):**
   - Phân tích hiệu số cân nặng và lượng calo tiêu thụ tuần qua.
   - Đề xuất kế hoạch dinh dưỡng 7 ngày tiếp theo linh hoạt:
     - Ngày tập luyện nhiều/Cuối tuần: Calories cao hơn một chút.
     - Ngày nghỉ ngơi: Calories thấp hơn để thâm hụt sâu (Deficit).
     - Gợi ý phân bổ tỷ lệ Macronutrients (Carb / Protein / Fat).

## Phase 5: Xuất Báo cáo Excel
1. Xây dựng cấu trúc dữ liệu Excel/CSV sạch bằng JavaScript thuần.
2. Thêm tiền tố **UTF-8 BOM** (`\uFEFF`) để đảm bảo các ký tự tiếng Việt hiển thị chính xác hoàn toàn trên Microsoft Excel.
3. Báo cáo gồm tiêu đề, thông tin ngày xuất, bảng chi tiết thực phẩm (Tên món, Bữa ăn, Khối lượng/Khẩu phần, Lượng calo nạp) và dòng tổng số Calories trong ngày.

## Phase 6: Tích hợp thông báo qua LINE
1. **Hỗ trợ Gửi LINE thật qua LINE Notify:**
   - Sử dụng yêu cầu POST đến cổng `https://notify-api.line.me/api/notify` (qua proxy hoặc trực tiếp nếu CORS cho phép).
   - Nội dung bao gồm tóm tắt calories ngày và lời khuyên giảm cân nhanh.
2. **Bộ giả lập LINE (LINE Simulator UI):**
   - Xây dựng giao diện mô phỏng ứng dụng LINE trên di động ngay trên màn hình.
   - Khi người dùng bấm "Gửi báo cáo qua LINE" (chế độ demo), màn hình giả lập sẽ kích hoạt hiệu ứng âm thanh và tin nhắn tin nhắn văn bản chi tiết xuất hiện mượt mà trong khung chat giả lập.
