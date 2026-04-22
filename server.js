require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== 数据库层（Turso + 内存回退） ====================
let db = null;           // 数据库实例
let useTurso = false;    // 是否使用真实数据库
let blessingsMemory = []; // 内存存储（回退用）

// 初始化数据库
async function initDatabase() {
    const TURSO_URL = process.env.TURSO_DATABASE_URL;
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

    if (TURSO_URL && TURSO_TOKEN) {
        try {
            const { createClient } = await import('@libsql/client');
            db = createClient({
                url: TURSO_URL,
                authToken: TURSO_TOKEN,
            });
            // 测试连接并创建表
            await db.execute(`
                CREATE TABLE IF NOT EXISTS blessings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nickname TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // 检查是否有数据，如果没有则插入两条示例
            const result = await db.execute('SELECT COUNT(*) as count FROM blessings');
            if (result.rows[0].count === 0) {
                await db.execute({
                    sql: 'INSERT INTO blessings (nickname, message) VALUES (?, ?)',
                    args: ['系统', '热烈祝贺大同二中校庆圆满成功！']
                });
                await db.execute({
                    sql: 'INSERT INTO blessings (nickname, message) VALUES (?, ?)',
                    args: ['校友会', '祝福母校桃李满天下！']
                });
                console.log('📝 已插入示例祝福数据');
            }
            useTurso = true;
            console.log('✅ 已连接 Turso 数据库，祝福数据将持久保存');
        } catch (err) {
            console.error('❌ Turso 数据库连接失败:', err.message);
            console.warn('⚠️ 将使用内存存储（数据不会持久化）');
            useTurso = false;
            initMemoryStorage();
        }
    } else {
        console.warn('⚠️ 未设置 TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN');
        console.warn('⚠️ 将使用内存存储（数据不会持久化）');
        initMemoryStorage();
    }
}

function initMemoryStorage() {
    blessingsMemory = [
        { id: 1, nickname: '系统', message: '热烈祝贺大同二中校庆圆满成功！', created_at: new Date().toISOString() },
        { id: 2, nickname: '校友会', message: '祝福母校桃李满天下！', created_at: new Date(Date.now() - 86400000).toISOString() }
    ];
}

// 获取所有祝福
async function getAllBlessings() {
    if (useTurso) {
        const result = await db.execute('SELECT id, nickname, message, created_at FROM blessings ORDER BY created_at DESC');
        return result.rows;
    } else {
        return [...blessingsMemory].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

// 添加祝福
async function addBlessing(nickname, message) {
    if (useTurso) {
        const result = await db.execute({
            sql: 'INSERT INTO blessings (nickname, message) VALUES (?, ?)',
            args: [nickname, message]
        });
        return { id: result.lastInsertRowid };
    } else {
        const newId = blessingsMemory.length + 1;
        const newBlessing = {
            id: newId,
            nickname,
            message,
            created_at: new Date().toISOString()
        };
        blessingsMemory.push(newBlessing);
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
    await initDatabase();
    if (useTurso) {
        console.log('💾 当前使用 Turso 数据库（持久存储）');
    } else {
        console.log('⚠️ 当前使用内存存储（重启后数据丢失）');
        console.log('💡 提示：请在 Pxxl App 环境变量中正确设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN 以启用持久存储');
    }
});