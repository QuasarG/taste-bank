import type { APIRoute } from 'astro';
import { whoami } from '@lib/whoami';
import { json, apiError } from '@lib/api-utils';

// 查身份：凭 x-invite-code 头（非签名），返回绑定状态 + 名下风格 + pending。
// CLI 投稿侧用：投稿前确认"我是谁、这个 slug 我投过没"。
export const GET: APIRoute = ({ request }) => {
  try {
    const inviteCode = request.headers.get('x-invite-code') ?? undefined;
    return json(whoami(inviteCode));
  } catch (e) {
    return apiError(e);
  }
};
