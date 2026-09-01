import type { APIRoute } from 'astro';
import { isMailConfigured } from '@lib/mail';
import { json } from '@lib/api-utils';

// 公开端点：邮件服务是否可用（前端用来展示维护中提示）
export const GET: APIRoute = () => {
  return json({ mailEnabled: isMailConfigured() });
};
