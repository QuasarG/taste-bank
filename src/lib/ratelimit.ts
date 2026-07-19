import crypto from 'node:crypto';
import { StyleRateLimitError } from './errors';

// 内存滑动窗口限流：进程级，重启清零，够用不引入依赖
const buckets = new Map<string, number[]>();

export function checkRate(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    throw new StyleRateLimitError(`请求过于频繁，请稍后再试（${key} 限 ${limit} 次 / ${Math.round(windowMs / 1000)}s）`);
  }
  arr.push(now);
  buckets.set(key, arr);
}

// 限流 key 不希望带秘密原文，统一取哈希前缀
export function rateKey(prefix: string, secretish: string | undefined): string {
  if (!secretish) return `${prefix}:anon`;
  return `${prefix}:${crypto.createHash('sha256').update(secretish).digest('hex').slice(0, 12)}`;
}

// 测试用：清空窗口
export function resetRate(): void {
  buckets.clear();
}
