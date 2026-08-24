import { GoogleGenerativeAI } from "@google/generative-ai";

// Use API key from command line
const apiKey = process.argv[2];

if (!apiKey) {
  console.error("Vui lòng cung cấp API Key: node test_key.mjs YOUR_API_KEY");
  process.exit(1);
}

async function testKey() {
  console.log("------------------------------------------");
  console.log(`Đang kiểm tra API Key: ${apiKey.substring(0, 10)}...`);
  console.log("------------------------------------------");

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // 1. List available models
    console.log("1. Đang lấy danh sách các model có sẵn cho Key này...");
    
    // Note: The JS SDK doesn't expose listModels directly. 
    // We'll try to generate a simple response with several potential model names.
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`\nĐang thử model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Chào bạn, hãy trả lời 'OK' để xác nhận kết nối.");
        console.log(`✅ Thành công! Phản hồi từ ${modelName}: ${result.response.text().trim()}`);
      } catch (err) {
        console.error(`❌ Thất bại với model ${modelName}:`);
        if (err.message.includes("404")) {
          console.error("   -> Lỗi 404: Model không tồn tại cho Key này.");
        } else if (err.message.includes("403")) {
          console.error("   -> Lỗi 403: Key không có quyền truy cập API này hoặc bị chặn theo vùng.");
        } else if (err.message.includes("401")) {
          console.error("   -> Lỗi 401: API Key không hợp lệ.");
        } else {
          console.error(`   -> Lỗi: ${err.message}`);
        }
      }
    }

  } catch (error) {
    console.error("Đã có lỗi nghiêm trọng xảy ra:", error.message);
  }
}

testKey();
