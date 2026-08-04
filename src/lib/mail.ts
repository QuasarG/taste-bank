// 邮件发送封装：nodemailer + SMTP 环境变量。
// SMTP 未配置时优雅降级——返回 {ok:false} 不崩，admin 台显示提示。
import { createTransport, type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;
let transportChecked = false;

function getTransporter(): Transporter | null {
  if (transportChecked) return transporter;
  transportChecked = true;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null; // 未配置
  const port = Number(process.env.SMTP_PORT || 587);
  transporter = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export function isMailConfigured(): boolean {
  return getTransporter() !== null;
}

/** 发邮件。返回 {ok, messageId?} 或 {ok:false, reason} */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; messageId?: string; reason?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, reason: 'SMTP not configured' };
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    const info = await t.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

/** 给管理员发提醒（收件人由 NOTIFY_TO 环境变量配置） */
export async function notifyAdmin(subject: string, text: string): Promise<{ ok: boolean; reason?: string }> {
  const to = process.env.NOTIFY_TO;
  if (!to) return { ok: false, reason: 'NOTIFY_TO not configured' };
  return sendMail({ to, subject, text });
}
