// ========== 校庆倒计时 ==========
// 设定校庆日期（年，月，日）— 请根据实际校庆日修改
const targetDate = new Date(2026, 9, 18); // 注意：月份从0开始，10月 => 9

function updateCountdown() {
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff <= 0) {
        document.getElementById('countdown').innerHTML = '<div class="time-block"><span>🎉</span><span class="label">校庆盛典进行时</span></div>';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (86400000)) / (3600000));
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    document.getElementById('days').innerText = String(days).padStart(2, '0');
    document.getElementById('hours').innerText = String(hours).padStart(2, '0');
    document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
    document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();

// 动态计算建校周年（假设1948年建校，可自行修改）
const foundingYear = 1948;
const currentYear = new Date().getFullYear();
let anniversary = currentYear - foundingYear;
if (new Date() < new Date(currentYear, 9, 18)) anniversary--;
document.getElementById('anniversary-years') && (document.getElementById('anniversary-years').innerText = anniversary);

// ========== 校歌播放器 ==========
const audio = document.getElementById('schoolAnthem');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

audio.addEventListener('loadedmetadata', () => {
    durationSpan.innerText = formatTime(audio.duration);
});

playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        audio.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
});

audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${percent}%`;
    currentTimeSpan.innerText = formatTime(audio.currentTime);
});

audio.addEventListener('ended', () => {
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    progressBar.style.width = '0%';
    currentTimeSpan.innerText = '0:00';
});

// 进度条点击跳转
const progressContainer = document.querySelector('.progress-container');
progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
});

// ========== 祝福墙功能 ==========
const blessingsList = document.getElementById('blessingsList');
const nicknameInput = document.getElementById('nickname');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('sendBlessingBtn');

// 获取并渲染祝福
async function loadBlessings() {
    try {
        const response = await fetch('/api/blessings');
        if (!response.ok) throw new Error('加载失败');
        const blessings = await response.json();
        
        if (blessings.length === 0) {
            blessingsList.innerHTML = '<div class="loading">💌 暂无祝福，快来写下第一份祝福吧~</div>';
            return;
        }
        
        blessingsList.innerHTML = blessings.map(b => {
            const date = new Date(b.created_at);
            const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
            return `
                <div class="blessing-item">
                    <div class="blessing-header">
                        <span class="blessing-nickname">${escapeHtml(b.nickname)}</span>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="blessing-message">${escapeHtml(b.message)}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('祝福加载错误:', error);
        blessingsList.innerHTML = '<div class="loading">⚠️ 祝福墙暂时无法连接，请稍后刷新。</div>';
    }
}

// 简单的防XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

// 发送祝福
async function sendBlessing() {
    const nickname = nicknameInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!nickname || !message) {
        alert('请填写昵称和祝福语~');
        return;
    }
    if (nickname.length > 20) {
        alert('昵称不能超过20个字符');
        return;
    }
    if (message.length > 200) {
        alert('祝福语不能超过200字');
        return;
    }
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 发送中...';
    
    try {
        const response = await fetch('/api/blessings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, message })
        });
        const data = await response.json();
        if (response.ok) {
            nicknameInput.value = '';
            messageInput.value = '';
            loadBlessings(); // 重新加载祝福列表
            alert('✨ 祝福已送达！感谢您对大同二中的爱');
        } else {
            alert(data.error || '发送失败，请重试');
        }
    } catch (error) {
        console.error(error);
        alert('网络错误，请稍后重试');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送祝福';
    }
}

sendBtn.addEventListener('click', sendBlessing);
loadBlessings();