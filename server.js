require('dotenv').config();
const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 检查关键环境变量
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ 错误：缺少 TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN 环境变量');
    console.error('请在平台的环境变量设置中添加它们');
    process.exit(1); // 退出进程，让平台看到错误
}

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
    console.log('✅ 数据库表初始化成功');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    // 不要退出，让应用继续运行但祝福墙功能会报错
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
    console.error('获取祝福失败:', error.message);
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
    console.error('保存祝福失败:', error.message);
    res.status(500).json({ error: '发送失败' });
  }
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🎉 校庆网站服务已启动，监听端口 ${PORT}`);
  console.log(`✅ 健康检查地址：http://localhost:${PORT}`);
  initDatabase();
});

// 捕获未处理的异常，防止进程意外退出
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的拒绝:', reason);
});