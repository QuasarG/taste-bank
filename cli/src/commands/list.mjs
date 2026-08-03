// taste-bank list [--q 词] [--json]
import { listStyles } from '../lib/api.mjs';
import { printLogo, printTable, c } from '../lib/ui.mjs';

/**
 * @param {string[]} args - 原始 argv（去掉 list 后的剩余）
 */
export async function cmdList(args) {
  const opts = parseArgs(args);
  const json = opts.json;

  const data = await listStyles(opts.q);

  if (json) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return;
  }

  printLogo(`${data.count} 套风格 · 列表浏览或用 --q 过滤`);

  if (data.count === 0) {
    console.log(c.gray('  暂无匹配风格。试试去掉过滤词，或访问 https://tastebank.cloud'));
    return;
  }

  const rows = data.styles.map((s) => [
    s.slug,
    s.name,
    c.gray(s.version),
    (s.mood || []).slice(0, 4).join(', '),
    s.summary,
  ]);

  printTable(['slug', 'name', 'ver', 'mood', 'summary'], rows, { maxColWidth: 50 });

  console.log();
  console.log(c.gray(`  取某风格的完整说明：taste-bank skill <slug>`));
  console.log(c.gray(`  落地到项目：       taste-bank use <slug>`));
}

/** 极简 argv 解析：--flag、--flag=val、--flag val、位置参数 */
function parseArgs(args) {
  const out = { q: null, json: false, _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') out.json = true;
    else if (a === '--q' || a === '-q') out.q = args[++i];
    else if (a.startsWith('--q=')) out.q = a.slice(4);
    else out._.push(a);
  }
  return out;
}
