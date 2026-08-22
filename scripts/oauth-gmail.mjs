// 重新授权 Gmail OAuth（供邮件链路换新 refresh_token）
// 用法：GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/oauth-gmail.mjs
// 前置：若该 OAuth 在 Google Cloud Console 侧是 Web 应用，需把重定向地址
//       http://127.0.0.1:8080 加入 Credentials 允许的重定向 URI（Desktop 类型免配置）。
// 注意：若 OAuth 应用处于「测试」状态，refresh_token 7 天即失效，建议发布为「生产」。
import http from 'node:http';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT = 'http://127.0.0.1:8080';
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('需要环境变量 GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT);
  if (url.pathname === '/') {
    const code = url.searchParams.get('code');
    const err = url.searchParams.get('error');
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    if (err) {
      res.end(`授权失败：${err}\n`);
      server.close();
      return;
    }
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const data = await r.json();
    if (data.refresh_token) {
      res.end(`✅ 授权成功！新的 refresh_token：\n\n${data.refresh_token}\n\n请把它配置进服务器的 systemd 环境变量（GMAIL_REFRESH_TOKEN）后重启服务。\n`);
      console.log(`refresh_token=${data.refresh_token}`);
      console.log(`access_token=${data.access_token}`);
    } else {
      res.end(`❌ 换取 token 失败：${JSON.stringify(data)}\n`);
      console.log(`token 响应：${JSON.stringify(data)}`);
    }
    server.close();
  } else {
    res.writeHead(404).end();
  }
});

server.listen(8080, '127.0.0.1', () => {
  console.log('1) 用管理该 Gmail 的账号在浏览器登录（本地脚本已在 127.0.0.1:8080 等待回调）：\n\n');
  console.log(authUrl);
  console.log('\n2) 授权完成后回到本窗口查看 refresh_token。若报 redirect_uri_mismatch，先到 Google Cloud Console 给该 OAuth client 添加重定向 http://127.0.0.1:8080');
});
