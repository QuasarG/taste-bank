import type { APIRoute } from 'astro';
import { addApplicant } from '@lib/applicants';
import { checkRate, rateKey } from '@lib/ratelimit';
import { json, apiError } from '@lib/api-utils';

// 公开端点：用户在 About 页填邮箱申请邀请码。无需鉴权，限流防刷。
export const POST: APIRoute = async ({ request }) => {
  try {
    // 限流：同 IP 每小时 3 次
    checkRate(rateKey('apply', request.headers.get('x-forwarded-for') || request.socket?.remoteAddress), 3, 3600_000);

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    // 邮箱校验
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: '请输入有效的邮箱地址' }, 400);
    }

    const { created, applicant } = addApplicant(email);

    // 通知邮件（模块四接入 mail.ts 后生效；此处预留，失败不阻塞）
    if (created) {
      try {
        const { notifyAdmin } = await import('@lib/mail');
        await notifyAdmin(
          '新的邀请码申请',
          `邮箱：${email}\n时间：${applicant.createdAt}\n\n前往 https://tastebank.cloud/admin 处理。`,
        );
      } catch {
        // mail.ts 不存在或 SMTP 未配，静默跳过
      }
    }

    return json({ ok: true, created, message: created ? '已收到，我们会尽快回复' : '你已申请过，请等待回复' });
  } catch (e) {
    return apiError(e);
  }
};
