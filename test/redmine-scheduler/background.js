const REDMINE_URL = 'https://redmine.thk-hd.vn/projects/mens-est/time_entries?set_filter=1&sort=spent_on%3Adesc&f%5B%5D=spent_on&op%5Bspent_on%5D=t&f%5B%5D=user_id&op%5Buser_id%5D=%3D&v%5Buser_id%5D%5B%5D=me&f%5B%5D=&c%5B%5D=spent_on&c%5B%5D=user&c%5B%5D=activity&c%5B%5D=issue&c%5B%5D=comments&c%5B%5D=hours&group_by=&t%5B%5D=hours&t%5B%5D=';

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'redmineRedirect') {
    // Mở tab Redmine ngay lập tức
    chrome.tabs.create({ url: 'https://redmine.thk-hd.vn/projects/mens-est/issues' });
    
  } else if (alarm.name === 'redmineStealthCheck') {
    // Chạy ngầm kiểm tra giờ log
    try {
      const response = await fetch(REDMINE_URL);
      const text = await response.text();
      
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const todayStr = `${day}-${month}-${year}`;

      const regex = new RegExp(`<td class="spent_on">${todayStr}<\\/td>.*?<td class="hours">([\\d:.]+)<\\/td>`, 'gs');
      
      let totalHours = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const hoursText = match[1];
        if (hoursText.includes(':')) {
          const [h, m] = hoursText.split(':');
          totalHours += parseFloat(h) + (parseFloat(m) / 60);
        } else {
          totalHours += parseFloat(hoursText);
        }
      }

      console.log(`Stealth check: Total hours for ${todayStr} is ${totalHours}`);

      if (totalHours < 8) {
        chrome.notifications.create('redmineWarning', {
          type: 'basic',
          iconUrl: 'assets/icon48.png',
          title: '⚠️ Cảnh báo giờ làm việc',
          message: `Bạn mới log ${totalHours.toFixed(2)}h ngày hôm nay. Chưa đủ 8h! (Sẽ nhắc lại sau 10p)`,
          priority: 2,
          requireInteraction: true
        });

        // Lên lịch nhắc lại sau 10 phút
        chrome.alarms.create('redmineStealthCheck', { delayInMinutes: 10 });
      } else {
        console.log("Đã đủ 8 tiếng, dừng nhắc nhở.");
      }
    } catch (error) {
      console.error('Error fetching Redmine data:', error);
    }
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'redmineWarning') {
    chrome.tabs.create({ url: REDMINE_URL });
  }
});
