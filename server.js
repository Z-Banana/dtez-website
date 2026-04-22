require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== Turso HTTP API 封装 ====================
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let useHttpApi = false;
let httpUrl = null;

// 将 libsql:// 或 http:// 转换为 https:// 的 REST API 端点
function getHttpUrl() {
    if (!TURSO_URL) return null;
    // Turso HTTP API 地址格式：https://数据库名.turso.io
    let url = TURSO_URL.replace('libsql://', 'https://');
    if (!url.startsWith('https://')) url = 'https://' + url;
    // 移除末尾斜杠
    return url.replace(/\/$/, '');
}

// 执行 SQL (通过 HTTP POST)
async function executeSql(sql, args = []) {
    if (!useHttpApi) throw new Error('HTTP API not available');
    // 注意：Turso HTTP API 的请求体格式
    const response = await fetch(`${httpUrl}/v2/pipeline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TURSO_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [
                {
                    type: "execute",
                    stmt: { sql, args }
                }
            ]
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    // 返回结果的第一条响应的结果
    const result = data.results?.[0];
    if (result?.error) throw new Error(result.error.message);
    return result;
}

// 查询多行
async function queryRows(sql, args = []) {
    const result = await executeSql(sql, args);
    return result.response?.result?.rows || [];
}

// 初始化数据库表
async function initDatabaseHttp() {
    try {
        // 创建表
        await executeSql(`
            CREATE TABLE IF NOT EXISTS blessings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // 检查是否有数据，如果没有则插入示例
        const rows = await queryRows('SELECT COUNT(*) as count FROM blessings');
        const count = rows[0]?.count || 0;
        if (count === 0) {
            await executeSql('INSERT INTO blessings (nickname, message) VALUES (?, ?)', ['系统', '热烈祝贺大同二中校庆圆满成功！']);
            await executeSql('INSERT INTO blessings (nickname, message) VALUES (?, ?)', ['校友会', '祝福母校桃李满天下！']);
            console.log('📝 已插入示例祝福数据');
        }
        console.log('✅ 已连接 Turso HTTP API，祝福数据将持久保存');
        return true;
    } catch (err) {
        console.error('❌ Turso HTTP API 连接失败:', err.message);
        return false;
    }
}

// ==================== 内存存储（回退） ====================
let blessingsMemory = [];
function initMemoryStorage() {
    blessingsMemory = [
        { id: 1, nickname: '系统', message: '热烈祝贺大同二中校庆圆满成功！', created_at: new Date().toISOString() },
        { id: 2, nickname: '校友会', message: '祝福母校桃李满天下！', created_at: new Date(Date.now() - 86400000).toISOString() }
    ];
}

async function getAllBlessings() {
    if (useHttpApi) {
        const rows = await queryRows('SELECT id, nickname, message, created_at FROM blessings ORDER BY created_at DESC');
        return rows.map(row => ({
            id: row.id,
            nickname: row.nickname,
            message: row.message,
            created_at: row.created_at
        }));
    } else {
        return [...blessingsMemory].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

async function addBlessing(nickname, message) {
    if (useHttpApi) {
        const result = await executeSql('INSERT INTO blessings (nickname, message) VALUES (?, ?)', [nickname, message]);
        const lastId = result.response?.result?.lastInsertRowid || Date.now();
        return { id: lastId };
    } else {
        const newId = blessingsMemory.length + 1;
        blessingsMemory.push({ id: newId, nickname, message, created_at: new Date().toISOString() });
        return { id: newId };
    }
}

// ==================== API 路由 ====================
app.get('/api/blessings', async (req, res) => {
    try {
        const blessings = await getAllBlessings();
        res.json(blessings);
    } catch (err) {
        console.error('获取祝福失败:', err);
        res.status(500).json({ error: '获取祝福失败' });
    }
});

app.post('/api/blessings', async (req, res) => {
    const { nickname, message } = req.body;
    if (!nickname || !message) {
        return res.status(400).json({ error: '昵称和祝福语都不能为空' });
    }
    if (nickname.length > 20) return res.status(400).json({ error: '昵称不能超过20个字符' });
    if (message.length > 200) return res.status(400).json({ error: '祝福语不能超过200个字符' });

    try {
        await addBlessing(nickname.trim(), message.trim());
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('保存祝福失败:', err);
        res.status(500).json({ error: '发送失败，请稍后重试' });
    }
});

// 健康检查
app.get('/health', (req, res) => res.send('OK'));

// 前端路由 fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🎉 校庆网站服务已启动，监听 0.0.0.0:${PORT}`);
    if (TURSO_URL && TURSO_TOKEN) {
        httpUrl = getHttpUrl();
        if (httpUrl) {
            const success = await initDatabaseHttp();
            if (success) {
                useHttpApi = true;
                console.log('💾 当前使用 Turso 数据库（持久存储）');
            } else {
                initMemoryStorage();
                console.warn('⚠️ 当前使用内存存储（重启后数据丢失）');
            }
        } else {
            initMemoryStorage();
            console.warn('⚠️ 无法解析数据库URL，使用内存存储');
        }
    } else {
        initMemoryStorage();
        console.warn('⚠️ 未设置环境变量，使用内存存储');
        console.log('💡 提示：请在 Pxxl App 环境变量中设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN');
    }
});