let recognition;
let isRecording = false;
let transcriptText = "";

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const exportBtn = document.getElementById('export-btn');
const transcriptBox = document.getElementById('transcript');
const statusDot = document.getElementById('status-indicator');

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN'; // Mặc định tiếng Việt, có thể chuyển đổi

    recognition.onstart = () => {
        isRecording = true;
        updateUI();
        console.log('Bắt đầu ghi âm...');
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            const now = new Date();
            const time = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
            transcriptText += `[${time}] ${finalTranscript}\n`;
            renderTranscript();
        }

        // Tạm thời hiển thị cả interim (đang nói) để user thấy realtime
        // const currentContent = transcriptText + (interimTranscript ? `... ${interimTranscript}` : "");
        // transcriptBox.innerText = currentContent;
    };

    recognition.onerror = (event) => {
        console.error('Lỗi nhận diện giọng nói:', event.error);
        if (event.error === 'not-allowed') {
            alert('Bạn cần cấp quyền microphone để sử dụng tính năng này.');
        }
    };

    recognition.onend = () => {
        if (isRecording) {
            recognition.start(); // Tự động bắt đầu lại if bị ngắt giữa chừng (vòng lặp vô hạn khi đang record)
        } else {
            updateUI();
        }
    };
} else {
    alert('Trình duyệt của bạn không hỗ trợ Web Speech API.');
    startBtn.disabled = true;
}

async function requestPermission() {
    try {
        // Kiểm tra xem đã có quyền chưa
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Đóng stream ngay sau khi check
        return true;
    } catch (err) {
        console.error('Permission denied or prompt blocked:', err);
        
        // Nếu bị từ chối hoặc bị chặn, hướng dẫn user mở tab mới để cấp quyền
        if (confirm('Tiện ích cần quyền Microphone của RIÊNG NÓ (khác với Google Meet). \n\nBạn có muốn mở trang cấp quyền trong tab mới không?')) {
            chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
        }
        return false;
    }
}

startBtn.addEventListener('click', async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    if (recognition && !isRecording) {
        transcriptText = ""; 
        transcriptBox.innerText = "";
        recognition.start();
        isRecording = true;
    }
});

stopBtn.addEventListener('click', () => {
    if (recognition && isRecording) {
        isRecording = false;
        recognition.stop();
    }
});

exportBtn.addEventListener('click', () => {
    if (transcriptText) {
        const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        a.href = url;
        a.download = `Meeting_Transcript_${dateStr}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
});

function renderTranscript() {
    transcriptBox.innerText = transcriptText;
    transcriptBox.parentElement.scrollTop = transcriptBox.parentElement.scrollHeight;
    exportBtn.disabled = transcriptText.length === 0;
}

function updateUI() {
    startBtn.disabled = isRecording;
    stopBtn.disabled = !isRecording;
    statusDot.classList.toggle('active', isRecording);
}

// Lắng nghe caption từ Google Meet (content.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Nhận tin nhắn:", message); 
    
    if (message.type === "CONTENT_SCRIPT_READY") {
        statusDot.style.boxShadow = "0 0 10px #38bdf8"; // Ánh sáng xanh dương khi nhận diện được trang meeting
        return;
    }

    if (message.type === "MEET_CAPTION") {
        if (!isRecording) {
            // Nếu chưa bấm ghi mà đã có phụ đề, nháy nhẹ cái đèn để user biết là extension đang "thấy" nội dung
            statusDot.style.opacity = "0.5";
            setTimeout(() => statusDot.style.opacity = "1", 200);
            return;
        }

        const { speaker, text } = message;
        const now = new Date();
        const time = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        
        const newEntry = `[${time}] ${speaker}: ${text}\n`;
        if (!transcriptText.endsWith(newEntry)) {
            transcriptText += newEntry;
            renderTranscript();
        }
    }
});
