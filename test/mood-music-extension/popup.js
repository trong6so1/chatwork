document.addEventListener('DOMContentLoaded', () => {
    const playBtn = document.getElementById('play-btn');
    const moodSelect = document.getElementById('mood');
    const genreSelect = document.getElementById('genre');

    playBtn.addEventListener('click', () => {
        const mood = moodSelect.value;
        const genre = genreSelect.value;
        const query = `${mood} ${genre} music playlist`;
        const encodedQuery = encodeURIComponent(query);
        const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIQAw%253D%253D`;

        // Gửi tin nhắn cho Background để nó tự xử lý (không bị chết khi popup đóng)
        chrome.runtime.sendMessage({
            action: 'startAutoPlay',
            url: youtubeUrl
        });
        
        // Hiệu ứng phản hồi nhỏ
        playBtn.innerText = "Đang bắt đầu...";
        setTimeout(() => window.close(), 500); // Đóng popup sau khi gửi lệnh
    });
});
