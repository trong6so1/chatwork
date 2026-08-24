document.addEventListener('DOMContentLoaded', () => {
  const alarmInput = document.getElementById('alarmTime');
  const setButton = document.getElementById('setAlarm');
  const statusDiv = document.getElementById('status');

  // Load existing alarm if any
  chrome.alarms.get('redmineRedirect', (alarm) => {
    if (alarm) {
      const date = new Date(alarm.scheduledTime);
      statusDiv.innerText = `Đang đặt lịch lúc: ${date.toLocaleString()}`;
      statusDiv.className = 'success';
    }
  });

  setButton.addEventListener('click', () => {
    const alarmTimeValue = alarmInput.value;
    if (!alarmTimeValue) {
      alert('Vui lòng chọn thời gian!');
      return;
    }

    const alarmTime = new Date(alarmTimeValue).getTime();
    const now = Date.now();

    if (alarmTime <= now) {
      alert('Vui lòng chọn thời gian trong tương lai!');
      return;
    }

    const delayInMinutes = Math.max(1, (alarmTime - now) / 1000 / 60);
    
    // 1. Phản hồi tức thì: Redirect tại thời điểm T
    chrome.alarms.create('redmineRedirect', { delayInMinutes });

    // 2. Chạy ngầm kiểm tra tại thời điểm T + 2 phút
    chrome.alarms.create('redmineStealthCheck', { delayInMinutes: delayInMinutes + 2 });

    // Show status
    const date = new Date(alarmTime);
    statusDiv.innerText = `Đã đặt lịch lúc: ${date.toLocaleString()}`;
    statusDiv.className = 'success';
    
    // Optional: Close popup after a short delay
    // setTimeout(() => window.close(), 2000);
  });
});
