import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  devToolbar: { enabled: false },
  // API 用 ed25519 签名 + 邀请码鉴权，不需要 Astro 的 CSRF form 保护。
  // 关掉后 CLI 的 POST/PUT/DELETE 才能直连（否则被 "Cross-site form submissions forbidden" 拦）。
  security: { checkOrigin: false },
});
