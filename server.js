require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== 测试静态文件服务 ===');
console.log('PORT:', PORT);
console.log('TURSO_DATABASE_URL 存在?', !!process.env.TURSO_DATABASE_URL);
console.log('TURSO_AUTH_TOKEN 存在?', !!process.env.TURSO_AUTH_TOKEN);

// 提供 public 目录下的静态文件
app.use(express.static('public'));

// 健康检查
app.get('/health', (req, res) => res.send('OK'));

// 其他路由 fallback 到 index.html（确保刷新页面也能正常访问）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器启动在 0.0.0.0:${PORT}`);
});