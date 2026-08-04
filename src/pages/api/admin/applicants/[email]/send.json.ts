import type { APIRoute } from 'astro';
import { assertAdmin } from '@lib/admin';
import { createInvite } from '@lib/invites';
import { markServed } from '@lib/applicants';
import { sendMail, isMailConfigured } from '@lib/mail';
import { json, apiError } from '@lib/api-utils';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    assertAdmin(request);
    const email = decodeURIComponent(params.email || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: '邮箱无效' }, 400);
    }

    // 生成邀请码
    const code = createInvite(email);
    // 邀请码 hash（用于记录，不存明文）
    const inviteHash = crypto.createHash('sha256').update(code).digest('hex');

    // 发邮件给申请者
    const mailResult = await sendMail({
      to: email,
      subject: 'Your Taste Bank invite code',
      text: `Hello,\n\nHere is your invite code for Taste Bank:\n\n${code}\n\nSet it in ~/.style-lab/config.json:\n  { "inviteCode": "${code}" }\n\nThen run: taste-bank submit <your-pack.json>\n\n— Taste Bank`,
      html: `<p>Hello,</p><p>Here is your invite code for Taste Bank:</p><pre style="font-size:1.1em;font-weight:bold">${code}</pre><p>Set it in <code>~/.style-lab/config.json</code>:</p><pre>{ "inviteCode": "${code}" }</pre><p>Then run: <code>taste-bank submit &lt;your-pack.json&gt;</code></p><p>— Taste Bank</p>`,
    });

    // 标记 served（即使邮件失败也标记，码已生成）
    markServed(email, inviteHash);

    return json({
      ok: true,
      email,
      code: mailResult.ok ? undefined : code, // 邮件失败时返回码让 admin 手动发
      mailed: mailResult.ok,
      mailReason: mailResult.ok ? undefined : mailResult.reason,
    });
  } catch (e) {
    return apiError(e);
  }
};
