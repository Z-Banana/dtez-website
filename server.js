require('dotenv').config();
const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDatabase() {
  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS blessings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 数据库初始化成功');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

app.get('/api/blessings', async (req, res) => {
  try {
    const result = await turso.execute(`
      SELECT id, nickname, message, created_at 
      FROM blessings 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: '获取祝福失败' });
  }
});

app.post('/api/blessings', async (req, res) => {
  const { nickname, message } = req.body;
  if (!nickname || !message) return res.status(400).json({ error: '昵称和祝福语都不能为空' });
  if (nickname.length > 20) return res.status(400).json({ error: '昵称过长' });
  if (message.length > 200) return res.status(400).json({ error: '祝福语过长' });
  try {
    await turso.execute({
      sql: 'INSERT INTO blessings (nickname, message) VALUES (?, ?)',
      args: [nickname, message]
    });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '发送失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🎉 校庆网站运行在 http://localhost:${PORT}`);
  initDatabase();
});