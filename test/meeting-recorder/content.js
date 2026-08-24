// Content script for Google Meet, Zoom, Teams
console.log("Meeting Recorder: Content script active.");

// Gửi tin nhắn "Chào hỏi" để sidepanel biết content script đã nạp
chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" });

let lastSentText = "";

const observer = new MutationObserver((mutations) => {
  // Tìm kiếm bất kỳ phần tử nào có vẻ là caption của Google Meet
  // Meet hay dùng jsname="VpS7ce" hoặc jsname="YSQA9c"
  const meetCaptions = document.querySelectorAll('span[jsname="VpS7ce"], div[jsname="YSQA9c"], .VpS7ce');
  
  if (meetCaptions.length > 0) {
    meetCaptions.forEach(el => {
      const text = el.innerText.trim();
      if (text && text !== lastSentText) {
        // Tìm tên người nói (thường ở lớp cha hoặc anh em)
        let speaker = "Người tham gia";
        const parent = el.closest('div[jsname="tS79oc"], .iS70o');
        if (parent) {
          speaker = parent.querySelector('.zsS8Me, .Y07G9b')?.innerText || "Người tham gia";
        }

        lastSentText = text;
        chrome.runtime.sendMessage({
          type: "MEET_CAPTION",
          speaker: speaker,
          text: text
        });
      }
    });
    return; // Nếu là Meet thì dừng check các app khác cho nhẹ
  }

  // Fallback cho các app khác (Zoom/Teams)
  const generalSelectors = ['.caption-text', '.captions-container', '.caption-content'];
  for (const sel of generalSelectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim() !== lastSentText) {
      lastSentText = el.innerText.trim();
      chrome.runtime.sendMessage({
        type: "MEET_CAPTION",
        speaker: "Phụ đề",
        text: lastSentText
      });
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Start observing the body for changes (Meet injects captions dynamically)
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log("Meeting Recorder: Content script loaded for Google Meet.");
