require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== 模拟 API 版本 - 祝福墙使用内存存储 ===');
console.log('PORT:', PORT);

app.use(express.json());
app.use(express.static('public'));

// 内存存储祝福数据（重启后丢失，仅用于测试）
let blessings = [
  { id: 1, nickname: '系统', message: '欢迎使用校庆祝福墙！这是演示数据。', created_at: new Date().toISOString() }
];

// 获取所有祝福
app.get('/api/blessings', (req, res) => {
  res.json(blessings.slice().reverse()); // 倒序返回，最新的在前
});

// 发送祝福
app.post('/api/blessings', (req, res) => {
  const { nickname, message } = req.body;
  if (!nickname || !message) {
    return res.status(400).json({ error: '昵称和祝福语都不能为空' });
  }
  if (nickname.length > 20) return res.status(400).json({ error: '昵称过长' });
  if (message.length > 200) return res.status(400).json({ error: '祝福语过长' });
  
  const newBlessing = {
    id: blessings.length + 1,
    nickname,
    message,
    created_at: new Date().toISOString()
  };
  blessings.push(newBlessing);
  res.status(201).json({ success: true, id: newBlessing.id });
});

// 健康检查
app.get('/health', (req, res) => res.send('OK'));

// 其他路由 fallback 到 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器启动在 0.0.0.0:${PORT}`);
  console.log(`模拟 API 已启用，祝福数据仅保存在内存中。`);
});