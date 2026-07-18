import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, type Browser } from 'playwright-core';
import { readStyleFile } from './store';

// 缓存目录：<slug>-<内容哈希>.png，模板变了哈希就变，自然失效
const CACHE_DIR = path.resolve(process.cwd(), 'data', 'screenshots');

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    // 容器/root 环境必须 no-sandbox
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  return browserPromise;
}

export async function ensureScreenshot(slug: string, templateUrl: string, file = 'page.html'): Promise<string> {
  const html = readStyleFile(slug, `templates/${file}`);
  const hash = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12);
  const target = path.join(CACHE_DIR, `${slug}-${hash}.png`);
  if (fs.existsSync(target)) return target;

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
}
