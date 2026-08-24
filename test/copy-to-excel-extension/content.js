// Function để lấy toàn bộ dữ liệu từ các input trên form
function getAllInputValues() {
    try {
        // Lấy tất cả các input, textarea, select không bị ẩn
        // Loại trừ các input không phải dữ liệu như submit, button, và các thẻ input tìm kiếm bên trong Select2
        const elements = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not(.select2-input), textarea, select');
        
        const rowData = [];

        elements.forEach(el => {
            let val = '';
            
            // Bỏ qua nếu element bị vô hiệu hóa (disabled) - tuỳ chọn, có thể comment lại nếu vẫn muốn lấy
            // if (el.disabled) return;

            if (el.tagName === 'SELECT') {
                // Với thẻ select (kể cả khi bị ẩn bởi Select2), lấy text của option đang được chọn
                if (el.selectedIndex >= 0 && el.options.length > 0) {
                    val = el.options[el.selectedIndex].text.trim();
                    // Bỏ qua các giá trị mặc định như "--Chọn--"
                    if (val.startsWith('--') || val === 'Chọn...') {
                        val = '';
                    }
                }
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    // Nếu là checkbox/radio, chỉ lấy giá trị nếu được check
                    if (el.checked) {
                        val = el.value !== 'on' ? el.value : 'Có'; // Hoặc có thể lấy label của nó
                    } else {
                        // Nếu không check, có thể bỏ qua hoặc để trống để giữ đúng số lượng cột
                        return; // Bỏ qua không cho vào mảng
                    }
                } else {
                    val = el.value.trim();
                }
            }

            rowData.push(val);
        });

        // Nối bằng ký tự Tab để khi paste vào Excel sẽ ra từng cột
        const tsvContent = rowData.join('\t');

        // Copy vào clipboard
        const textarea = document.createElement('textarea');
        textarea.value = tsvContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        return { success: true, data: rowData };
    } catch (error) {
        console.error("Lỗi khi copy dữ liệu:", error);
        return { success: false, error: error.message };
    }
}

// Thực thi function và trả kết quả về cho popup
getAllInputValues();
