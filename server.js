require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== Turso HTTP API 配置 ====================
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

function getHttpUrl() {
    if (!TURSO_URL) return null;
    let url = TURSO_URL.replace('libsql://', 'https://');
    if (!url.startsWith('https://')) url = 'https://' + url;
    return url.replace(/\/$/, '');
}

const httpUrl = getHttpUrl();
let dbReady = false;

// 将普通参数转换为 Turso 要求的格式
function formatArgs(args) {
    if (!args || args.length === 0) return [];
    return args.map(arg => ({
        type: "text",
        value: String(arg)
    }));
}

async function executeSql(sql, args = []) {
    if (!httpUrl || !TURSO_TOKEN) throw new Error('Missing Turso credentials');
    const formattedArgs = formatArgs(args);
    const body = {
        requests: [
            {
                type: "execute",
                stmt: {
                    sql: sql,
                    args: formattedArgs
                }
            }
        ]
    };
    const response = await fetch(`${httpUrl}/v2/pipeline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TURSO_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    const result = data.results?.[0];
    if (result?.error) throw new Error(result.error.message);
    return result;
}

async function queryRows(sql, args = []) {
    const result = await executeSql(sql, args);
    const rows = result.response?.result?.rows || [];
    // 将行数据中的列转换为简单对象（因为Turso返回的每行是数组）
    const columns = result.response?.result?.cols || [];
    return rows.map(row => {
        const obj = {};
        columns.forEach((col, idx) => {
            obj[col.name] = row[idx];
        });
        return obj;
    });
}

async function initDatabaseHttp() {
    try {
        await executeSql(`
            CREATE TABLE IF NOT EXISTS blessings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
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
    if (dbReady) {
        const rows = await queryRows('SELECT id, nickname, message, created_at FROM blessings ORDER BY created_at DESC');
        return rows;
    } else {
        return [...blessingsMemory].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

async function addBlessing(nickname, message) {
    if (dbReady) {
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

app.get('/health', (req, res) => res.send('OK'));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🎉 校庆网站服务已启动，监听 0.0.0.0:${PORT}`);
    if (httpUrl && TURSO_TOKEN) {
        const success = await initDatabaseHttp();
        if (success) {
            dbReady = true;
            console.log('💾 当前使用 Turso 数据库（持久存储）');
        } else {
            initMemoryStorage();
            console.warn('⚠️ 当前使用内存存储（重启后数据丢失）');
        }
    } else {
        initMemoryStorage();
        console.warn('⚠️ 未设置有效的环境变量，使用内存存储');
        console.log('💡 提示：请在 Pxxl App 环境变量中正确设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN');
    }
});