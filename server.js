require('dotenv').config();
const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 打印环境变量状态（不输出真实值，保护隐私）
console.log('🔍 环境变量检查:');
console.log('  TURSO_DATABASE_URL 已设置?', !!process.env.TURSO_DATABASE_URL);
console.log('  TURSO_AUTH_TOKEN 已设置?', !!process.env.TURSO_AUTH_TOKEN);
console.log('  PORT:', PORT);

// 如果没有数据库变量，打印警告但不退出
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.warn('⚠️ 警告: 缺少 TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN，祝福墙功能将不可用');
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 健康检查端点（用于平台检测）
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 如果有数据库配置，则初始化数据库和API
let turso = null;
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // 初始化数据库表
  turso.execute(`
    CREATE TABLE IF NOT EXISTS blessings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).then(() => console.log('✅ 数据库初始化成功'))
    .catch(err => console.error('❌ 数据库初始化失败:', err.message));

  // 祝福墙API
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
} else {
  console.warn('⚠️ 未配置数据库，祝福墙API将返回模拟数据');
  app.get('/api/blessings', (req, res) => res.json([]));
  app.post('/api/blessings', (req, res) => res.status(503).json({ error: '数据库未配置' }));
}

// 监听所有网络接口
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 校庆网站服务已启动，监听 0.0.0.0:${PORT}`);
  console.log(`✅ 健康检查地址: http://0.0.0.0:${PORT}/health`);
});