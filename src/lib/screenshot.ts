import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, type Browser } from 'playwright-core';
import { readStyleFile, STYLES_DIR } from './store';

// 缓存目录：STYLE_LAB_DIR/data/screenshots，<slug>-<内容哈希>.png，模板变了哈希就变，自然失效
const CACHE_DIR = path.join(path.dirname(STYLES_DIR), 'data', 'screenshots');

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({
    // 优先用 playwright 自带 chromium（版本匹配、无 snap 沙盒问题）；
    // CHROMIUM_PATH 仅在 playwright 自带不可用时才用（向后兼容旧部署，但 snap chromium 在 systemd 下不可用）。
    executablePath: resolveChromiumPath(),
    headless: true,
    // 容器/root 环境必须 no-sandbox
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  return browserPromise;
}

// 解析 chromium 可执行路径：playwright 自带优先，环境变量次之，系统 chromium 兜底
function resolveChromiumPath(): string {
  try {
    return chromium.executablePath();
  } catch {
    return process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  }
}

export async function ensureScreenshot(slug: string, templateUrl: string, file = 'page.html'): Promise<string> {
  const html = readStyleFile(slug, `templates/${file}`);
  const hash = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12);
  const target = path.join(CACHE_DIR, `${slug}-${hash}.png`);
  if (fs.existsSync(target)) return target;

  // 1GB 内存机器（Azure B1s 规格）扛不住并发 chromium：整条截图链路排队执行，一次只渲染一个
  return screenshotQueue(async () => {
    if (fs.existsSync(target)) return target; // 排队期间可能已被前面的请求渲染完
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const browser = await getBrowser();
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    try {
      await page.goto(templateUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.screenshot({ path: target, type: 'png' });
    } finally {
      await page.close();
    }
    return target;
  });
}

// 全局串行队列：截图任务逐个执行，避免多个 chromium 页面同时驻留内存
let screenshotChain: Promise<unknown> = Promise.resolve();
function screenshotQueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = screenshotChain.then(fn, fn);
  screenshotChain = next.catch(() => {});
  return next;
}
