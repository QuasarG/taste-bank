// TUI 组件：ASCII logo、颜色、表格、spinner 包装
// 自包含、零依赖（颜色用 ANSI 转义，不用 picocolors——cli 够用）

const isTTY = process.stdout.isTTY;
const NO_COLOR = process.env.NO_COLOR || !isTTY;

// 禁用颜色时所有染色函数退化为 identity，保证 pipe 到文件不出乱码
function paint(code) {
  return (s) => (NO_COLOR ? s : `\x1b[${code}m${s}\x1b[0m`);
}

const c = {
  reset: paint(0),
  bold: paint(1),
  dim: paint(2),
  italic: paint(3),
  underline: paint(4),
  red: paint(31),
  green: paint(32),
  yellow: paint(33),
  blue: paint(34),
  magenta: paint(35),
  cyan: paint(36),
  white: paint(37),
  gray: paint(90),
  brightRed: paint(91),
  brightGreen: paint(92),
  brightYellow: paint(93),
  brightBlue: paint(94),
  brightMagenta: paint(95),
  brightCyan: paint(96),
};

// 状态图标（TTY 用 emoji，非 TTY 用 ASCII 避免乱码）
const icon = {
  ok: isTTY ? '✓' : 'OK',
  err: isTTY ? '✗' : 'X',
  warn: isTTY ? '⚠' : '!',
  info: isTTY ? 'ℹ' : 'i',
  arrow: isTTY ? '→' : '->',
  bullet: isTTY ? '•' : '-',
  dot: isTTY ? '·' : '.',
};

// ---------- ASCII Logo ----------
// "TASTE BANK" figlet 风格（standard 字体简化版，5 行高）
const LOGO_LINES = [
  '████████╗░█████╗░░█████╗░██████╗░██████╗░░█████╗░████████╗',
  '╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝',
  '░░░╚██╗░░███████║███████║██████╔╝██║░░██║███████║░░░╚██╗░░',
  '░░░░╚██╗░██╔══██║██╔══██║██╔══██╗██║░░██║██╔══██║░░░░╚██╗░',
  '░░░░░╚██╗██║░░██║██║░░██║██║░░██║╚██████╔╝██║░░██║░░░░░╚██╗',
  '░░░░░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝░╚═════╝░╚═╝░░╚═╝░░░░░░╚═╝',
];

// 渐变色 logo：每行用不同色，营造 TASTE BANK 渐变感
const LOGO_GRADIENT = [c.magenta, c.brightMagenta, c.brightBlue, c.cyan, c.brightCyan, c.blue];

/**
 * 打印 TASTE BANK 字符艺术 logo，带渐变色。
 * @param {string} [tagline] - logo 下方一行小字
 */
export function printLogo(tagline) {
  if (NO_COLOR) {
    // 非 TTY：不打 logo（污染管道输出），只打 tagline
    if (tagline) console.log(tagline);
    return;
  }
  console.log();
  for (let i = 0; i < LOGO_LINES.length; i++) {
    const painter = LOGO_GRADIENT[i % LOGO_GRADIENT.length];
    console.log('  ' + painter(LOGO_LINES[i]));
  }
  if (tagline) {
    console.log('  ' + c.gray(tagline));
  }
  console.log();
}

// ---------- 简易表格 ----------
/**
 * 打印对齐表格。auto-fit 列宽，超长截断。
 * @param {string[]} headers
 * @param {string[][]} rows
 * @param {{maxColWidth?: number}} [opts]
 */
export function printTable(headers, rows, opts = {}) {
  const maxColWidth = opts.maxColWidth ?? 40;
  const truncate = (s, w) => (s.length > w ? s.slice(0, w - 1) + '…' : s);

  const widths = headers.map((h, i) => {
    const colMax = Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length));
    return Math.min(colMax, maxColWidth);
  });

  const pad = (s, w) => truncate(String(s ?? ''), w).padEnd(w);
  const sep = widths.map((w) => '─'.repeat(w + 2)).join('');

  // 表头加粗 + 下划线
  const headerLine = '  ' + headers.map((h, i) => c.bold(pad(h, widths[i]))).join('  ');
  if (NO_COLOR) {
    console.log(headerLine);
    console.log('  ' + sep);
  } else {
    console.log(headerLine);
    console.log('  ' + c.gray(sep));
  }
  for (const row of rows) {
    console.log('  ' + row.map((cell, i) => pad(cell, widths[i])).join('  '));
  }
}

// ---------- Spinner（@clack/prompts 包装，自动处理非 TTY）----------
// 顶层一次性 import 并缓存，避免每次 log 都动态加载（也保证非 await 调用不出错）
let clack = null;
let clackLoading = null;
function getClack() {
  if (clack) return Promise.resolve(clack);
  if (!clackLoading) clackLoading = import('@clack/prompts').then((m) => { clack = m; return m; });
  return clackLoading;
}
// 模块加载即预热——后续 log 函数可假定已就绪（非 TTY 时即使没就绪也走 console 分支）
getClack();

/**
 * 带 spinner 执行异步任务。非 TTY 退化为 console.log + await。
 * @param {string} msg - spinner 文案
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function spin(msg, fn) {
  if (NO_COLOR || !isTTY) {
    console.log(`${icon.bullet} ${msg}...`);
    return fn();
  }
  const p = await getClack();
  const s = p.spinner();
  s.start(msg);
  try {
    const result = await fn();
    s.stop(msg);
    return result;
  } catch (e) {
    s.stop(c.red(`${msg} 失败`));
    throw e;
  }
}

// ---------- 日志助手 ----------
export async function intro(title) {
  const p = await getClack();
  if (isTTY) p.intro(title);
  else console.log(title);
}

export async function outro(msg) {
  const p = await getClack();
  if (isTTY) p.outro(msg);
  else console.log(msg);
}

export async function note(title, lines) {
  if (!isTTY) {
    console.log(`\n# ${title}`);
    for (const l of lines) console.log(`  ${l}`);
    return;
  }
  const p = await getClack();
  // @clack/prompts 的 note 第二参数是 title，body 用 \n 连接
  p.note(lines.join('\n'), title);
}

export async function logOk(msg) {
  if (!isTTY) { console.log(`${icon.ok} ${msg}`); return; }
  const p = await getClack();
  p.log.success(msg);
}
export async function logErr(msg) {
  if (!isTTY) { console.error(`${icon.err} ${msg}`); return; }
  const p = await getClack();
  p.log.error(msg);
}
export async function logWarn(msg) {
  if (!isTTY) { console.log(`${icon.warn} ${msg}`); return; }
  const p = await getClack();
  p.log.warning(msg);
}
export async function logInfo(msg) {
  if (!isTTY) { console.log(`${icon.info} ${msg}`); return; }
  const p = await getClack();
  p.log.info(msg);
}
export async function logStep(msg) {
  if (!isTTY) { console.log(`${icon.arrow} ${msg}`); return; }
  const p = await getClack();
  p.log.step(msg);
}

// ---------- 确认/选择（仅 TTY；非 TTY 直接返回默认值，不打断管道）----------
export async function confirm(message, { defaultValue = true } = {}) {
  if (!isTTY) return defaultValue;
  const p = await getClack();
  return p.confirm({ message, initialValue: defaultValue });
}

export async function select(message, options) {
  if (!isTTY) return options[0]?.value;
  const p = await getClack();
  return p.select({ message, options });
}

export { c, icon, isTTY, NO_COLOR };
