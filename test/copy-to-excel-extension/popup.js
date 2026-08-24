document.getElementById('copyBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Đang xử lý...';
    statusDiv.className = 'loading';

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        }, (results) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Lỗi: Không thể chạy script trên trang này.';
                statusDiv.className = 'error';
                console.error(chrome.runtime.lastError);
                return;
            }
            if (results && results[0] && results[0].result) {
                if (results[0].result.success) {
                    statusDiv.textContent = 'Đã copy thành công! (Ctrl+V vào Excel)';
                    statusDiv.className = 'success';
                } else {
                    statusDiv.textContent = 'Có lỗi: ' + results[0].result.error;
                    statusDiv.className = 'error';
                }
            } else {
                statusDiv.textContent = 'Không có phản hồi từ trang.';
                statusDiv.className = 'error';
            }
        });
    } catch (err) {
        statusDiv.textContent = 'Lỗi: ' + err.message;
        statusDiv.className = 'error';
    }
});
