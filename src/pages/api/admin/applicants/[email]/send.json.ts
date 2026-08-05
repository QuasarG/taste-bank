import type { APIRoute } from 'astro';
import { assertAdmin } from '@lib/admin';
import { createInvite } from '@lib/invites';
import { markServed } from '@lib/applicants';
import { sendMail } from '@lib/mail';
import { inviteMail } from '@lib/mail-templates';
import { json, apiError } from '@lib/api-utils';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    assertAdmin(request);
    const email = decodeURIComponent(params.email || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: '邮箱无效' }, 400);
    }

    // 从请求体读语言偏好
    let lang: 'zh' | 'en' = 'en';
    try {
      const body = await request.clone().json();
      if (body?.lang === 'zh') lang = 'zh';
    } catch {}

    // 生成邀请码
    const code = createInvite(email);
    const inviteHash = crypto.createHash('sha256').update(code).digest('hex');
    markServed(email, inviteHash);

    const t = inviteMail[lang];
    const mailResult = await sendMail({
      to: email,
      subject: t.subject,
      text: t.text(code),
      html: t.html(code),
    });

    return json({
      ok: true,
      email,
      code: mailResult.ok ? undefined : code,
      mailed: mailResult.ok,
      mailReason: mailResult.ok ? undefined : mailResult.reason,
    });
  } catch (e) {
    return apiError(e);
  }
};
