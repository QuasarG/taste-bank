// 邮件发送：Gmail API（OAuth2 refresh_token，走 HTTPS 443，绕过 SMTP 端口封锁）。
// 环境变量：GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN / GMAIL_FROM / NOTIFY_TO
// 未配置时优雅降级——返回 {ok:false} 不崩。

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

interface CachedToken { accessToken: string; expiresAt: number; }
let tokenCache: CachedToken | null = null;

function isMailConfigured(): boolean {
  return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
}

/** 用 refresh_token 换 access_token（带缓存，提前 60s 过期） */
async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.accessToken;
  const resp = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gmail token refresh failed: ${resp.status} ${body}`);
  }
  const data = await resp.json() as { access_token: string; expires_in: number };
  tokenCache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/** RFC 822 邮件构建（base64url 编码，Gmail API 要求） */
function buildRawEmail(opts: { to: string; subject: string; text: string; html?: string }): string {
  const from = process.env.GMAIL_FROM || 'me';
  const lines = [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
  ];
  if (opts.html) {
    const boundary = 'tb_' + Math.random().toString(36).slice(2);
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', '', opts.text, '');
    lines.push(`--${boundary}`, 'Content-Type: text/html; charset=UTF-8', '', opts.html, '', `--${boundary}--`);
  } else {
    lines.push('Content-Type: text/plain; charset=UTF-8', '', opts.text);
  }
  const raw = lines.join('\r\n');
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export { isMailConfigured };

/** 发邮件。返回 {ok, messageId?} 或 {ok:false, reason} */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; messageId?: string; reason?: string }> {
  if (!isMailConfigured()) return { ok: false, reason: 'Gmail API not configured' };
  try {
    const accessToken = await getAccessToken();
    const raw = buildRawEmail(opts);
    const resp = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      return { ok: false, reason: `Gmail API ${resp.status}: ${body.slice(0, 200)}` };
    }
    const data = await resp.json() as { id: string };
    return { ok: true, messageId: data.id };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

/** 给管理员发提醒 */
export async function notifyAdmin(subject: string, text: string): Promise<{ ok: boolean; reason?: string }> {
  const to = process.env.NOTIFY_TO;
  if (!to) return { ok: false, reason: 'NOTIFY_TO not configured' };
  return sendMail({ to, subject, text });
}
