import type { APIRoute } from 'astro';
import { addApplicant } from '@lib/applicants';
import { checkRate, rateKey } from '@lib/ratelimit';
import { json, apiError } from '@lib/api-utils';

// 确认邮件模板（双语）
const confirmMail = {
  zh: {
    subject: '[Taste Bank] 已收到你的邀请码申请',
    text: (code: string) => `感谢你对 Taste Bank 的关注！

我们已经收到你的邀请码申请，正在处理中。

审核通过后，你会收到另一封邮件，里面包含你的邀请码和配置说明。

— Taste Bank`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;line-height:1.6">
<h2 style="color:#126984;border-bottom:2px solid #126984;padding-bottom:8px">感谢你对 Taste Bank 的关注！</h2>
<p>我们已经收到你的邀请码申请，正在处理中。</p>
<p>审核通过后，你会收到另一封邮件，里面包含你的邀请码和配置说明。</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="color:#999;font-size:0.8em">— Taste Bank</p></div>`,
  },
  en: {
    subject: '[Taste Bank] We received your request',
    text: (code: string) => `Thanks for your interest in Taste Bank!

We've received your invite code request and are processing it now.

Once approved, you'll receive another email with your invite code and setup instructions.

— Taste Bank`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;line-height:1.6">
<h2 style="color:#126984;border-bottom:2px solid #126984;padding-bottom:8px">Thanks for your interest in Taste Bank!</h2>
<p>We've received your invite code request and are processing it now.</p>
<p>Once approved, you'll receive another email with your invite code and setup instructions.</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="color:#999;font-size:0.8em">— Taste Bank</p></div>`,
  },
};

export const POST: APIRoute = async ({ request }) => {
  try {
    checkRate(rateKey('apply', request.headers.get('x-forwarded-for') || request.socket?.remoteAddress), 3, 3600_000);

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const lang = body?.lang === 'zh' ? 'zh' : 'en';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: lang === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email' }, 400);
    }

    const { created, applicant } = addApplicant(email);

    if (created) {
      try {
        const { sendMail } = await import('@lib/mail');
        const t = confirmMail[lang];
        const autoUrl = `https://tastebank.cloud/auto-approve?email=${encodeURIComponent(email)}&token=${applicant.autoToken}`;
        // 1. 给管理员发提醒（带一键发放按钮）
        await sendMail({
          to: process.env.NOTIFY_TO || '',
          subject: `[Taste Bank] 新的邀请码申请：${email}`,
          text: `新的邀请码申请\n\n邮箱：${email}\n时间：${applicant.createdAt}\n\n一键发放：${autoUrl}\n（链接一次性有效，点击后自动生成邀请码并发送给申请人）\n\n或前往 https://tastebank.cloud/admin 手动处理。`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;line-height:1.6">
<h2 style="color:#126984;border-bottom:2px solid #126984;padding-bottom:8px">新的邀请码申请</h2>
<table style="width:100%;margin:12px 0">
<tr><td style="color:#999;width:60px">邮箱</td><td style="font-weight:bold">${email}</td></tr>
<tr><td style="color:#999">时间</td><td>${applicant.createdAt}</td></tr>
</table>
<div style="text-align:center;margin:20px 0">
<a href="${autoUrl}" style="display:inline-block;background:#126984;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:bold;font-size:1.05em">一键发放邀请码 →</a>
</div>
<p style="font-size:0.85em;color:#999;text-align:center">点击后自动生成邀请码并发送给申请人<br>链接一次性有效，或前往 <a href="https://tastebank.cloud/admin" style="color:#126984">admin 台</a> 手动处理</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="color:#999;font-size:0.8em">— Taste Bank</p></div>`,
        });
        // 2. 给申请者发确认邮件
        await sendMail({ to: email, subject: t.subject, text: t.text(''), html: t.html });
      } catch {
        // mail.ts 不存在或未配置，静默跳过
      }
    }

    return json({
      ok: true,
      created,
      message: created
        ? (lang === 'zh' ? '已收到，我们会尽快回复' : 'Application received. We will respond soon.')
        : (lang === 'zh' ? '你已申请过，请等待回复' : 'You have already applied. Please wait.'),
    });
  } catch (e) {
    return apiError(e);
  }
};
