# Chatwork AI Bot (Gemini Integration)

## 1. Giới thiệu

Đây là một project Chatwork AI Bot tích hợp sức mạnh của mô hình Google Gemini. 
Mục đích của hệ thống này là biến một tài khoản bot trên Chatwork thành một AI Assistant thực thụ, có thể trả lời các câu hỏi, hỗ trợ công việc khi được người dùng nhắc đến (mention/reply) trong các nhóm chat (Room).

- **Chatwork làm gì?**: Đóng vai trò là nền tảng giao tiếp. Người dùng sẽ chat với Bot thông qua Chatwork, và hệ thống của chúng ta sẽ sử dụng Chatwork API để gửi câu trả lời trở lại nhóm chat.
- **Gemini làm gì?**: Là bộ não AI (LLM) của hệ thống, xử lý ngôn ngữ tự nhiên để đọc hiểu câu hỏi và sinh ra câu trả lời phù hợp.
- **Backend làm gì?**: Đóng vai trò là cầu nối (middleware). Backend sẽ mở ra một endpoint Webhook để lắng nghe tin nhắn từ Chatwork, xử lý logic, lọc bỏ các tin nhắn không cần thiết, gửi câu hỏi đến Gemini, và cuối cùng dùng API để trả lời lại Chatwork.
- **ngrok làm gì?**: Trong quá trình phát triển (Local), backend của bạn chỉ chạy ở `localhost:3000`. Chatwork ở ngoài Internet không thể gửi Webhook vào `localhost` được. `ngrok` sẽ tạo một đường hầm (tunnel), cấp cho bạn một đường dẫn public HTTPS (ví dụ: `https://xxxxx.ngrok.app`) và chuyển tiếp mọi request từ đường dẫn đó vào `localhost:3000` của bạn.

### Flow toàn hệ thống:
```
Chatwork
   ↓ (Gửi event qua Webhook)
ngrok
   ↓ (Chuyển tiếp tunnel)
localhost:3000
   ↓
Backend (Xử lý logic, chống duplicate, lọc vòng lặp)
   ↓ (Gửi câu hỏi)
Gemini API
   ↓ (Nhận câu trả lời)
Backend
   ↓ (Gọi API)
Chatwork API (Bot trả lời lại vào nhóm)
```

---

## 2. Kiến trúc

Hệ thống được thiết kế theo mô hình MVC đơn giản, tập trung vào tính rõ ràng và không over-engineering.

```
[Webhook Controller] (Nhận HTTP Request, trả về 200 OK lập tức)
        ↓
[Event Handler] (Xử lý background, phát hiện Bot Mention, chống Duplicate, chống Loop)
        ↓
[Chatwork Service] (Làm sạch chuỗi tin nhắn, loại bỏ tag)
        ↓
[Gemini Service] (Gửi tin nhắn sạch cho Gemini AI và nhận kết quả)
        ↓
[Chatwork Service] (Format lại kết quả kèm tag Reply và gửi lên Chatwork)
```

**Trách nhiệm từng module:**
- `app.ts & server.ts`: Cấu hình Express server, định tuyến (router) và nhận raw body.
- `chatwork.webhook.ts & chatwork.signature.ts`: Chịu trách nhiệm bảo mật, kiểm tra chữ ký (Signature) xem request có thực sự đến từ Chatwork hay không.
- `chatwork.controller.ts`: Tiếp nhận request, phản hồi HTTP 200 OK nhanh chóng (Chatwork yêu cầu phản hồi nhanh, nếu không sẽ bị tính là timeout).
- `chatwork-message.handler.ts`: Controller logic chính. Lọc tin nhắn trùng lặp, tin nhắn do chính bot gửi (tránh bot tự trả lời nhau vô hạn), và nhận diện mention.
- `chatwork.service.ts`: Chứa các hàm giao tiếp với API Chatwork.
- `gemini.service.ts`: Chứa các hàm giao tiếp với API của Google Gemini.

---

## 3. Requirements

Để chạy được project, bạn cần chuẩn bị:

- **Node.js** (Khuyên dùng v18 hoặc v20+)
- **npm** (Đi kèm với Node.js)
- **ngrok** (Tạo tài khoản và cài đặt CLI ngrok)
- Tài khoản Chatwork (Có quyền tạo API Token và Webhook)
- **Gemini API Key** (Lấy từ Google AI Studio)

**Hướng dẫn kiểm tra version:**
Mở Terminal / Command Prompt và gõ:
```bash
node -v
npm -v
ngrok version
```
Nếu các lệnh trên đều hiển thị phiên bản (version), bạn đã sẵn sàng!

---

## 4. Cài đặt

Mở Terminal và chạy tuần tự các lệnh sau:

```bash
# 1. Clone (tải) source code về máy (Nếu bạn chưa có source code)
# git clone <url_repo>
# cd chatwork-gemini-bot

# 2. Cài đặt các thư viện phụ thuộc (dependencies) dựa trên file package.json
npm install
```

**Giải thích:**
- `npm install` sẽ tải các thư viện như `express`, `axios`, `@google/generative-ai` vào thư mục `node_modules/`.

---

## 5. Cấu hình `.env`

Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

Mở file `.env` vừa tạo và điền các thông tin:

```env
PORT=3000

CHATWORK_API_TOKEN=your_chatwork_api_token
CHATWORK_BOT_ACCOUNT_ID=your_chatwork_bot_account_id
CHATWORK_WEBHOOK_TOKEN=your_chatwork_webhook_token

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

**Giải thích chi tiết:**
- `PORT`: Cổng chạy server ở local (mặc định 3000, **không bắt buộc** đổi).
- `CHATWORK_API_TOKEN`: Lấy từ mục API Setting của tài khoản Bot trên Chatwork (**Bắt buộc**).
- `CHATWORK_BOT_ACCOUNT_ID`: Dãy số ID tài khoản của Bot (ví dụ: `1234567`). Lấy bằng cách xem Profile của Bot (**Bắt buộc**).
- `CHATWORK_WEBHOOK_TOKEN`: Token dùng để ký mã xác thực Webhook. Sinh ra khi bạn tạo Webhook trên Chatwork (**Bắt buộc**).
- `GEMINI_API_KEY`: API Key lấy từ trang [Google AI Studio](https://aistudio.google.com/) (**Bắt buộc**).
- `GEMINI_MODEL`: Model Gemini sử dụng (mặc định là `gemini-1.5-flash`, **không bắt buộc** đổi).

**Lưu ý:** TUYỆT ĐỐI KHÔNG commit file `.env` lên Github hoặc chia sẻ cho người khác. File này đã được thêm vào `.gitignore` để đảm bảo an toàn.

---

## 6. Chạy Local

Sau khi cấu hình xong `.env`, chạy lệnh sau để khởi động Backend:

```bash
npm run dev
```

Server sẽ báo:
```text
[INFO] Server is running on port 3000
[INFO] Health check: http://localhost:3000/health
[INFO] Webhook endpoint: POST /webhooks/chatwork
```

Mở một Terminal khác để kiểm tra xem Server đã "sống" chưa bằng cách test Health Check:
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok"
}
```

*Nếu bước này trả về lỗi (như Connection Refused), hãy chuyển sang phần **Debug** bên dưới.*

---

## 7. Chạy ngrok

Để Chatwork có thể gửi sự kiện vào `localhost:3000`, bạn cần public port 3000 bằng ngrok.

Mở một Terminal mới (đừng tắt Terminal đang chạy `npm run dev`) và gõ:

```bash
ngrok http 3000
```

Bạn sẽ thấy ngrok tạo ra một URL có dạng:
```
Forwarding                    https://xxxxx.ngrok.app -> http://localhost:3000
```
*(Trong đó `xxxxx` là chuỗi ngẫu nhiên ngrok cấp cho bạn).*

**Giải thích:**
```
localhost:3000
       ↑
       │
     ngrok
       │
       ↓
https://xxxxx.ngrok.app
```

Bây giờ, URL Webhook hoàn chỉnh của bạn để cấu hình vào Chatwork sẽ là:
`https://xxxxx.ngrok.app/webhooks/chatwork`

---

## 8. Cấu hình Chatwork Webhook

Hướng dẫn từng bước cấu hình Webhook trên Chatwork:

1. Đăng nhập Chatwork bằng tài khoản Bot (hoặc tài khoản quản lý Bot).
2. Nhấn vào tên tài khoản ở góc trên bên phải màn hình -> Chọn **API Setting** (Cài đặt API).
3. Mở tab **Webhook**.
4. Nhấn **Create new Webhook** (Tạo mới).
5. Đặt tên Webhook tuỳ ý.
6. Ở ô **Webhook URL**, nhập URL ngrok của bạn: `https://xxxxx.ngrok.app/webhooks/chatwork`.
7. Chọn Event kích hoạt: Đánh dấu tick vào mục **Room Event** -> **Message created** (Tạo tin nhắn mới).
8. Nhấn **Create** (Tạo).
9. Màn hình sẽ hiển thị ra một chuỗi **Webhook Token**. Copy chuỗi này, bỏ vào biến `CHATWORK_WEBHOOK_TOKEN` trong file `.env` của bạn, sau đó khởi động lại lệnh `npm run dev` ở bước 6.
10. Thêm tài khoản Bot vào một Group Chat bất kỳ để chuẩn bị Test.

---

## 9. Test end-to-end

Kiểm tra toàn bộ hệ thống bằng các kịch bản sau:

### Test 1 – Health
```bash
curl http://localhost:3000/health
```
*(Đã test ở phần 6, đảm bảo vẫn trả về `{"status":"ok"}`)*.

### Test 2 – TO Bot
Trong Group Chatwork có chứa Bot, hãy tag Bot và hỏi một câu:
```
[To:1234567] Tên Bot
Xin chào, bạn có thể giải thích Docker là gì không?
```

**Expected Flow:**
```
Chatwork -> Webhook -> ngrok -> localhost -> Gemini -> Chatwork API -> Bot phản hồi vào Group
```
Trên Terminal `npm run dev`, bạn sẽ thấy Log lần lượt xuất hiện: `[WEBHOOK] Event received...`, `[BOT] Is mention/reply: true...`, `[GEMINI] Request started...`, `[CHATWORK] Sending response...`.

### Test 3 – Normal message
Gửi một tin nhắn bình thường (không tag Bot):
```
Hôm nay deploy lúc mấy giờ mọi người?
```
**Expected:** Bot im lặng. Trên terminal sẽ log `[BOT] Is mention/reply: false. Normal message ignored.`

### Test 4 – Reply
Sử dụng tính năng Reply (Trả lời) vào một tin nhắn cũ của Bot.
**Expected:** Bot nhận diện được đây là reply (`[rp aid=...]`) và sẽ lấy nội dung tin nhắn gửi cho Gemini rồi trả lời lại tương tự như Test 2.

### Test 5 – CC
Chatwork không có chức năng "CC" mặc định cho API/Webhook một cách tường minh, CC thường chỉ là gửi nhiều `[To:]` trong cùng một tin. Hệ thống đã được thiết kế để tìm kiếm `[To:BotAccountId]`, do đó nếu tin nhắn tag cả Bot và người khác (tương tự như CC), Bot vẫn sẽ nhận ra mình được nhắc đến và phản hồi.

---

## 10. Debug từ A đến Z

Nếu quá trình Test ở trên không hoạt động, hãy bình tĩnh làm theo từng bước Debug cực kỳ chi tiết dưới đây.

### Debug Level 1 – Backend
Kiểm tra Backend của bạn.
```bash
curl http://localhost:3000/health
```
Nếu Fail, hãy kiểm tra Terminal chạy lệnh `npm run dev`:
- Có báo lỗi `EADDRINUSE` không? (Port 3000 đang bị phần mềm khác sử dụng, hãy tắt phần mềm đó).
- File `.env` cấu hình sai format? (Sửa lại cho đúng `KEY=VALUE`).
- Có báo lỗi "Missing required environment variables"? (Bạn điền thiếu biến bắt buộc trong `.env`).

### Debug Level 2 – ngrok
Backend chạy OK nhưng ngrok không lên?
Chạy lệnh `ngrok http 3000`. Sau khi ngrok hiện HTTPS URL, hãy mở Terminal khác test:
```bash
curl https://xxxxx.ngrok.app/health
```
**Expected:** `{"status": "ok"}`
Nếu Fail, chứng tỏ ngrok bị lỗi hoặc tường lửa (Firewall) chặn. Kiểm tra lại kết nối mạng.

### Debug Level 3 – Ngrok Inspector
Ngrok cung cấp một giao diện web để bạn theo dõi mọi request đi qua nó. Mở trình duyệt và truy cập:
```
http://localhost:4040
```
Đây là **Traffic Inspector**. Bất cứ khi nào Chatwork gửi Webhook, bạn sẽ thấy một dòng request mới xuất hiện ở đây.
Hãy click vào request đó để xem:
- HTTP Method có phải là `POST`?
- URL có phải là `/webhooks/chatwork`?
- Thẻ **Headers** có header `X-ChatworkWebhookSignature` hay không?
- HTTP Status trả về là 200, 401 hay 500?

### Debug Level 4 – Chatwork Webhook
Khi bạn chat trên Chatwork, nếu ở **Debug Level 3 (Ngrok Inspector)** không xuất hiện bất kỳ request nào:
- Webhook của bạn cấu hình sai URL.
- Bạn quên tích chọn Event (Message created) trên Chatwork.
- Bot chưa được thêm vào Group Chat mà bạn đang gửi tin nhắn.

Nếu request đã xuất hiện trên ngrok nhưng Terminal `npm run dev` không log `[WEBHOOK] Event received`:
- URL Webhook của bạn ở Chatwork đang thiếu `/webhooks/chatwork` ở đuôi.

### Debug Level 5 – Signature
Nếu ngrok báo `401 Unauthorized`:
- Lỗi này xuất phát từ việc tính toán Signature không khớp.
- **Nguyên nhân 1:** Biến `CHATWORK_WEBHOOK_TOKEN` trong `.env` chưa được cập nhật, hoặc copy bị dư dấu cách.
- **Nguyên nhân 2:** Dữ liệu Request Body bị thay đổi (Stringify lại) trước khi tính toán mã Hash. Hãy đảm bảo bạn sử dụng raw body.
- **Cách test:** Trong Inspector, xem `X-ChatworkWebhookSignature` và Body của request đó. Flow của hệ thống là:
```
Raw Body Request (từ buffer)
   ↓
HMAC-SHA256 (với khóa là Webhook Token)
   ↓
Mã hóa Base64
   ↓
So sánh với X-ChatworkWebhookSignature (Nếu không khớp trả 401).
```
**Tuyệt đối không log secret ra màn hình.**

### Debug Level 6 – Event Parsing
Webhook nhận được (200 OK) nhưng Bot vẫn im lặng?
Bật chế độ debug an toàn bằng cách sử dụng `logger.info` in ra các thông số cơ bản (Không in body bí mật).
Kiểm tra các trường:
- `event_type` có phải `message_created`?
- `room_id` có tồn tại?
- `from_account_id` là ai?

### Debug Level 7 – Bot Detection
Kiểm tra biến `CHATWORK_BOT_ACCOUNT_ID` trong `.env`.
Nếu bạn điền sai (ví dụ điền ID tài khoản của BẠN thay vì BOT), hệ thống sẽ so sánh:
`if (from_account_id === CHATWORK_BOT_ACCOUNT_ID)` và chặn mất tin nhắn vì tưởng đó là bot đang tự chat với chính mình.

### Debug Level 8 – Gemini
Kiểm tra Terminal xem có Log `[GEMINI] Request started` không?
Nếu có nhưng tiếp theo báo lỗi (Request failed):
- Lỗi `400 / 401 / 403`: API Key Gemini của bạn sai, đã hết hạn, hoặc chưa kích hoạt quyền sử dụng model.
- Lỗi `429`: Bạn gọi API quá nhiều, bị rate limit (Giới hạn). Đợi 1 phút rồi thử lại.
- Lỗi `timeout`: Kết nối từ mạng của bạn đến Google AI gặp trục trặc.

### Debug Level 9 – Chatwork Response
Nếu Log báo `[GEMINI] Request completed` nhưng Chatwork vẫn chưa thấy tin nhắn:
Nghĩa là việc gọi lại Chatwork API bị lỗi.
Kiểm tra:
- `CHATWORK_API_TOKEN` đúng chưa?
- Status Code trả về từ Chatwork là bao nhiêu?
- Nếu trả `403 Forbidden`: API Token không có quyền post vào room đó, hoặc bot đã bị kick khỏi room.

### Debug Level 10 – Duplicate
Nếu Bot trả lời 1 câu giống hệt nhau **2 lần** cho cùng một tin nhắn của bạn:
- Chatwork đang gửi trùng Webhook (đây là chuyện bình thường khi mạng chậm, Chatwork tưởng bạn chưa nhận được nên gửi lại).
- Hệ thống đã tích hợp logic **Idempotency** (In-memory Set) qua event `room_id` + `message_id` để chặn. Hãy kiểm tra xem file `.env` hoặc server có bị khởi động lại (restart) giữa chừng làm mất bộ nhớ In-memory không. (Trên môi trường thật nên dùng Redis).

### Debug Level 11 – Bot Loop
Nếu Bot bị "tâm thần phân liệt", tự trả lời chính nó hàng chục lần không dừng:
Flow đúng:
```
Bot nhắn -> Webhook gửi -> Backend nhận -> Kiểm tra from_account_id === CHATWORK_BOT_ACCOUNT_ID -> IGNORE (Bỏ qua).
```
Nếu loop xảy ra, 100% là do cấu hình `CHATWORK_BOT_ACCOUNT_ID` trong file `.env` của bạn bị sai, khiến đoạn logic IGNORE bị vô hiệu hóa. Hãy vào Chatwork xem chuẩn xác ID của con bot.

---

## 11. Troubleshooting Table

| Hiện tượng | Nguyên nhân có thể | Cách kiểm tra |
| --- | --- | --- |
| localhost không chạy | Backend lỗi / Lỗi cú pháp TS | Chạy `npm run dev` xem lỗi báo đỏ gì |
| `/health` fail | Server chưa chạy / Khác Port | Kiểm tra Terminal |
| ngrok không connect | Port sai / Lỗi mạng | Chạy lệnh `ngrok http 3000` |
| Chatwork không gửi webhook | URL/Webhook sai, Bot chưa vào nhóm | Kiểm tra Dashboard Chatwork Webhook |
| Nhận lỗi 401 Webhook | Signature sai | Kiểm tra `CHATWORK_WEBHOOK_TOKEN` |
| Webhook nhận nhưng Bot im lặng | Event parsing / Không tag Bot | Xem Chatwork Payload (Có chứa To hay Rp không) |
| Gemini không trả lời | API key sai hoặc model lỗi | Xem Terminal phần `[GEMINI]` log |
| Chatwork không nhận response | API Token sai / Lỗi quyền hạn | Xem Terminal phần `[CHATWORK]` log |
| Bot trả lời 2 lần | Duplicate webhook | Kiểm tra tính năng idempotency (In-memory Set) |
| Bot tự trả lời vô hạn (Loop) | Bot loop bypass | Kiểm tra biến `CHATWORK_BOT_ACCOUNT_ID` |

---

## 12. Debug Checklist

Sử dụng checklist này để khoanh vùng lỗi nhanh chóng:

- [ ] Backend chạy không có lỗi ở Terminal.
- [ ] Lệnh `GET http://localhost:3000/health` trả về 200 OK.
- [ ] Lệnh `ngrok http 3000` chạy thành công.
- [ ] Public URL (https://xxxxx.ngrok.app) có thể truy cập `/health`.
- [ ] Chatwork Webhook đã lưu URL của ngrok.
- [ ] Bot đã được mời (Invite) vào Group Chat.
- [ ] Khi chat tag bot, request xuất hiện trên ngrok Inspector (localhost:4040).
- [ ] Backend nhận webhook (Log in ra `[WEBHOOK] Event received`).
- [ ] Chữ ký Webhook hợp lệ (Không trả về lỗi 401).
- [ ] Parse event chuẩn (Phân loại đúng mention/reply).
- [ ] Bot detection đúng (Chặn tin nhắn bot gửi ra, lọc non-mention).
- [ ] Request gọi lên Gemini hoàn tất.
- [ ] Response từ Gemini được gửi qua Chatwork API thành công.
- [ ] Tin nhắn phản hồi của Bot hiển thị đúng trong Group Chatwork.

---

## 13. Future Improvements (MVP xong mới tính)

Hệ thống hiện tại hoàn toàn đáp ứng tốt cho MVP và chạy Local. Khi đưa lên Production chạy thực tế lâu dài, bạn cần cân nhắc:

1. **Redis**: Thay thế In-memory Set trong chức năng chống Duplicate để dữ liệu không bị mất khi khởi động lại server.
2. **Queue (RabbitMQ/BullMQ)**: Tách việc gọi Gemini AI ra khỏi luồng xử lý Webhook trực tiếp. Nhận webhook -> Đẩy vào Queue -> Xử lý ngầm, giúp phản hồi 200 OK cho Chatwork nhanh tuyệt đối.
3. **Docker**: Đóng gói ứng dụng thành container để chạy ở mọi nơi (VPS/Cloud).
4. **Monitoring**: Thêm Sentry, Datadog hoặc Prometheus để theo dõi sức khỏe hệ thống.
