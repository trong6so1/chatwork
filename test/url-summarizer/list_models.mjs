const apiKey = process.argv[2];

if (!apiKey) {
  console.error("❌ Vui lòng cung cấp API Key: node list_models.mjs YOUR_API_KEY");
  console.log("------------------------------------------");
  console.log("Hướng dẫn lấy Key:");
  console.log("1. Truy cập: https://aistudio.google.com/app/apikey");
  console.log("2. Copy API Key của bạn.");
  console.log("3. Chạy lệnh: node list_models.mjs <Key_của_bạn>");
  process.exit(1);
}

async function listModels() {
  console.log("------------------------------------------");
  console.log(`Kiểm tra API Key cho Google Gemini...`);
  console.log("------------------------------------------");

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Lỗi API (Status ${response.status}):`);
      console.error(`-> Thông điệp: ${data.error?.message || "Không xác định"}`);
      console.error(`-> Trạng thái: ${data.error?.status || "Không xác định"}`);
      
      if (response.status === 400) {
        console.log("\n💡 Gợi ý: API Key của bạn có thể không hợp lệ hoặc bị nhập sai.");
      } else if (response.status === 403) {
        console.log("\n💡 Gợi ý: Key của bạn có thể bị hạn chế vùng (Region) hoặc chưa được kích hoạt API.");
      }
      return;
    }

    if (data.models && data.models.length > 0) {
      console.log("✅ Thành công! Các model khả dụng cho Key này:");
      data.models
        .filter(m => m.supportedGenerationMethods.includes("generateContent"))
        .forEach(m => {
          console.log(`- ${m.name.split('/').pop()} (${m.displayName})`);
        });
      console.log("\n👉 Bạn có thể dùng các tên model trên (ví dụ: gemini-1.5-flash) cho extension.");
    } else {
      console.log("⚠️ Key hợp lệ nhưng không tìm thấy model nào có quyền generateContent.");
    }
  } catch (error) {
    console.error("❌ Lỗi kết nối mạng:", error.message);
  }
}

listModels();
