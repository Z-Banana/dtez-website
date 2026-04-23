// ========== 校庆倒计时 ==========
const targetDate = new Date(2026, 9, 18); // 10月18日

function updateCountdown() {
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff <= 0) {
        document.getElementById('countdown').innerHTML = '<div class="time-block"><span>🎉</span><span>校庆进行时</span></div>';
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

// 建校周年动态（假设1948年建校）
const foundingYear = 1948;
const currentYear = new Date().getFullYear();
let anniversary = currentYear - foundingYear;
if (new Date() < new Date(currentYear, 9, 18)) anniversary--;
const anniSpan = document.getElementById('anniversary-years');
if (anniSpan) anniSpan.innerText = anniversary;

// ========== 校歌播放器 ==========
const audio = document.getElementById('schoolAnthem');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressFill = document.getElementById('progressFill');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
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
    progressFill.style.width = `${percent}%`;
    currentTimeSpan.innerText = formatTime(audio.currentTime);
});

audio.addEventListener('ended', () => {
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    progressFill.style.width = '0%';
    currentTimeSpan.innerText = '0:00';
});

// 进度条点击
const progressBg = document.querySelector('.progress-bar-bg');
if (progressBg) {
    progressBg.addEventListener('click', (e) => {
        const rect = progressBg.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * audio.duration;
    });
}

// ========== 祝福墙功能（与后端API交互）==========
const blessingsList = document.getElementById('blessingsList');
const nicknameInput = document.getElementById('nickname');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('sendBlessingBtn');

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function loadBlessings() {
    try {
        const res = await fetch('/api/blessings');
        if (!res.ok) throw new Error();
        const blessings = await res.json();
        if (blessings.length === 0) {
            blessingsList.innerHTML = '<div class="loading-state">✨ 暂无祝福，快来写下第一份祝福吧~</div>';
            return;
        }
        blessingsList.innerHTML = blessings.map(b => {
            const date = new Date(b.created_at);
            const fmt = `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
            return `
                <div class="blessing-item">
                    <div class="blessing-header">
                        <span class="blessing-nickname">${escapeHtml(b.nickname)}</span>
                        <span>${fmt}</span>
                    </div>
                    <div class="blessing-message">${escapeHtml(b.message)}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        blessingsList.innerHTML = '<div class="loading-state">⚠️ 祝福墙连接异常，请稍后刷新</div>';
    }
}

async function sendBlessing() {
    const nickname = nicknameInput.value.trim();
    const message = messageInput.value.trim();
    if (!nickname || !message) {
        alert('请填写昵称和祝福语~');
        return;
    }
    if (nickname.length > 20) return alert('昵称过长');
    if (message.length > 200) return alert('祝福语过长');

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 发送中...';

    try {
        const res = await fetch('/api/blessings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, message })
        });
        const data = await res.json();
        if (res.ok) {
            nicknameInput.value = '';
            messageInput.value = '';
            loadBlessings();
            alert('💖 祝福已送达！感谢您对大同二中的爱');
        } else {
            alert(data.error || '发送失败');
        }
    } catch (err) {
        alert('网络错误，请稍后重试');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 传递祝福';
    }
}

sendBtn.addEventListener('click', sendBlessing);
loadBlessings();

// 平滑滚动
document.querySelectorAll('.nav-links a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const hash = this.getAttribute('href');
        if (hash === '#') return;
        e.preventDefault();
        const target = document.querySelector(hash);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});