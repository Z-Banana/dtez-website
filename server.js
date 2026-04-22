const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== 极简测试服务器启动 ===');
console.log('PORT:', PORT);

app.get('/', (req, res) => {
  res.send('Hello! 大同二中校庆网站正在调试中。如果看到这条消息，说明服务器运行正常。');
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器已启动，监听 0.0.0.0:${PORT}`);
  console.log(`访问地址: http://0.0.0.0:${PORT}`);
});