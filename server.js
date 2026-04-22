require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== 测试 dotenv 和环境变量 ===');
console.log('PORT:', PORT);
console.log('TURSO_DATABASE_URL 存在?', !!process.env.TURSO_DATABASE_URL);
console.log('TURSO_AUTH_TOKEN 存在?', !!process.env.TURSO_AUTH_TOKEN);

app.get('/', (req, res) => {
  res.send('环境变量加载测试成功。数据库配置' + (process.env.TURSO_DATABASE_URL ? '已' : '未') + '设置。');
});

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器启动在 0.0.0.0:${PORT}`);
});