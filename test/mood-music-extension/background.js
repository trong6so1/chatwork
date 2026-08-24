// Service Worker (background.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startAutoPlay') {
        const { url } = message;
        
        chrome.tabs.create({ url }, (tab) => {
            // Lắng nghe sự kiện update của chính tab này
            const listener = (tabId, info) => {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    console.log('Mood Music: Tab đã load xong, bắt đầu tiêm script...');
                    
                    // Tiêm script xử lý việc "nhấn nút phát" sau một khoảng dừng ngắn
                    setTimeout(() => {
                        chrome.scripting.executeScript({
                            target: { tabId: tabId, allFrames: false },
                            func: () => {
                                console.log('Mood Music: Đang quét toàn bộ các liên kết trên trang...');
                                let attempts = 0;
                                const interval = setInterval(() => {
                                    attempts++;
                                    
                                    // Danh sách các selector mạnh mẽ nhất
                                    const selectors = [
                                        'a#video-title', 
                                        'a#thumbnail',
                                        'ytd-playlist-renderer a',
                                        'ytd-video-renderer a',
                                        'a.yt-simple-endpoint'
                                    ];
                                    
                                    for (const selector of selectors) {
                                        const elements = document.querySelectorAll(selector);
                                        for (const el of elements) {
                                            const href = el.getAttribute('href');
                                            if (href && (href.includes('/watch?v=') || href.includes('/playlist?list='))) {
                                                const fullUrl = href.startsWith('http') ? href : 'https://www.youtube.com' + href;
                                                console.log('Mood Music: ĐÃ TÌM THẤY LINK:', fullUrl);
                                                clearInterval(interval);
                                                
                                                // Thông báo cho người dùng biết (tùy chọn, để debug)
                                                // alert('Đã tìm thấy nhạc! Đang bắt đầu phát...'); 
                                                
                                                window.location.href = fullUrl;
                                                return;
                                            }
                                        }
                                    }

                                    if (attempts > 50) {
                                        clearInterval(interval);
                                        console.log('Mood Music: Thất bại sau 50 lần thử.');
                                    }
                                }, 500);
                            }
                        }).catch(err => console.error('Mood Music Injection Error:', err));
                    }, 1500); // Tăng độ trễ tiêm mã lên 1.5s
                }
            };
            
            chrome.tabs.onUpdated.addListener(listener);
        });
    }
});
