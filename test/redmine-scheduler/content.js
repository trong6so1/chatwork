(function() {
  console.log('Redmine Time Entry Check script loaded');

  function checkHours() {
    // Check if we are on the specific time entries page with the filter
    // We can also just run this on any time_entries page since we'll check today's date
    
    const rows = document.querySelectorAll('table.list.time-entries tbody tr');
    let totalHours = 0;
    
    // Format date today
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const todayStr = `${day}-${month}-${year}`; // DD-MM-YYYY
    const alternativeTodayStr = `${year}-${month}-${day}`; // YYYY-MM-DD (sometimes used)

    console.log('Checking hours for today:', todayStr);

    rows.forEach(row => {
      const dateCell = row.querySelector('td.spent_on');
      const hourCell = row.querySelector('td.hours');
      
      if (dateCell && hourCell) {
        const rowDate = dateCell.innerText.trim();
        // Check if row date matches today (handles both formats)
        if (rowDate === todayStr || rowDate === alternativeTodayStr) {
          // Some Redmine versions show hours as "8:00" or just "8.0"
          const hoursText = hourCell.innerText.trim();
          let hours = 0;
          if (hoursText.includes(':')) {
            const [h, m] = hoursText.split(':');
            hours = parseFloat(h) + (parseFloat(m) / 60);
          } else {
            hours = parseFloat(hoursText);
          }
          totalHours += hours;
        }
      }
    });

    console.log('Total hours found for today:', totalHours);

    if (totalHours < 8) {
      const msg = `⚠️ Redmine: Bạn mới log ${totalHours.toFixed(2)} giờ hôm nay. Chưa đủ 8 tiếng!`;
      
      // Floating Alert UI
      const alertDiv = document.createElement('div');
      alertDiv.id = 'redmine-time-check-alert';
      alertDiv.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 99999;
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.5s ease-out;
      `;
      
      const style = document.createElement('style');
      style.innerText = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `;
      document.head.appendChild(style);

      alertDiv.innerHTML = `<span>${msg}</span><button style="background:none;border:none;color:white;cursor:pointer;font-weight:bold;font-size:18px;">&times;</button>`;
      alertDiv.querySelector('button').onclick = () => alertDiv.remove();
      
      // Prevent duplicate alerts
      if (!document.getElementById('redmine-time-check-alert')) {
        document.body.appendChild(alertDiv);
      }
    }
  }

  // Run after a short delay to ensure table is rendered (Redmine sometimes uses async loading for filters)
  if (document.readyState === 'complete') {
    setTimeout(checkHours, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(checkHours, 1000));
  }
})();
