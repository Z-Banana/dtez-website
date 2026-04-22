require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== 添加模拟祝福墙 API ===');
console.log('PORT:', PORT);

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 模拟数据存储（内存中，重启后丢失）
let blessings = [
  {
    id: 1,
    nickname: '系统',
    message: '热烈祝贺大同二中校庆圆满成功！',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    nickname: '校友会',
    message: '祝福母校桃李满天下！',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

// 获取所有祝福
app.get('/api/blessings', (req, res) => {
  console.log('GET /api/blessings 返回', blessings.length, '条祝福');
  res.json(blessings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
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
    nickname: nickname.trim(),
    message: message.trim(),
    created_at: new Date().toISOString()
  };
  blessings.push(newBlessing);
  console.log('POST /api/blessings 新增祝福:', newBlessing.nickname);
  res.status(201).json({ success: true, id: newBlessing.id });
});

// 健康检查
app.get('/health', (req, res) => res.send('OK'));

// 其他路由 fallback 到 index.html（支持前端路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器启动在 0.0.0.0:${PORT}`);
  console.log(`📝 祝福墙 API 已启用（模拟模式，数据仅内存存储）`);
});