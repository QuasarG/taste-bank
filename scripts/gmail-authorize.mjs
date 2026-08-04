// Gmail API 一次性授权脚本：跑一次，浏览器授权，输出 refresh_token。
// 用法：GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/gmail-authorize.mjs
// 或：把 Google 下载的 client_secret JSON 路径作为第一个参数传入。
import { createServer } from 'node:http';
import fs from 'node:fs';

// 从环境变量或 JSON 文件读凭据（不硬编码，避免泄露）
function loadCredentials() {
  const jsonFile = process.argv[2];
  if (jsonFile) {
    const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const c = raw.installed || raw.web;
    return { clientId: c.client_id, clientSecret: c.client_secret };
  }
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
    return { clientId: process.env.GMAIL_CLIENT_ID, clientSecret: process.env.GMAIL_CLIENT_SECRET };
  }
  console.error('用法：GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/gmail-authorize.mjs');
  console.error('  或：node scripts/gmail-authorize.mjs /path/to/client_secret_xxx.json');
  process.exit(1);
}

const { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET } = loadCredentials();
const REDIRECT_PORT = 3000;
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', `http://localhost:${REDIRECT_PORT}`);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Gmail API 授权');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. 在浏览器打开这个 URL：\n');
console.log(authUrl.toString());
console.log('\n2. 用 zexinguo72@gmail.com 登录并授权');
console.log(`3. 授权后会跳转到 http://localhost:${REDIRECT_PORT}，本脚本自动捕获\n`);
console.log('等待授权中...\n');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<h1>授权失败</h1><p>${error}</p><p>可以关闭此页面。</p>`);
    console.error('✗ 授权失败：', error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // 用 code 换 refresh_token
  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: `http://localhost:${REDIRECT_PORT}`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResp.json();

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    if (tokens.refresh_token) {
      res.end('<h1>✓ 授权成功</h1><p>refresh_token 已打印到终端，可以关闭此页面。</p>');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  ✓ 授权成功！');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('refresh_token（复制这个值配到服务器）：\n');
      console.log(tokens.refresh_token);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      res.end('<h1>⚠ 未拿到 refresh_token</h1><p>可能之前授权过。撤销访问后重试：<br>https://myaccount.google.com/permissions</p>');
      console.error('✗ 未返回 refresh_token（可能之前授权过，未带 prompt=consent）');
      console.error('返回内容：', JSON.stringify(tokens));
    }
  } catch (e) {
    res.end(`<h1>出错</h1><p>${e.message}</p>`);
    console.error('✗ 换 token 失败：', e.message);
  }
  server.close();
  process.exit(0);
});

server.listen(REDIRECT_PORT, () => {
  console.log(`本地回调服务监听 http://localhost:${REDIRECT_PORT}\n`);
});
