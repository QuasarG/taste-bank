// taste-bank favorite <slug>          收藏
// taste-bank unfavorite <slug>        取消收藏
// taste-bank favorite --ls | favorites   列收藏
import { addFavorite, removeFavorite, readFavorites } from '../lib/config.mjs';
import { logOk, logErr, logInfo, c, printTable } from '../lib/ui.mjs';

export async function cmdFavorite(args) {
  const listMode = args.includes('--ls') || args.includes('-l');
  const slug = args.find((a) => !a.startsWith('-'));

  if (listMode) {
    const favs = readFavorites();
    if (favs.length === 0) {
      await logInfo('还没有收藏。运行 taste-bank favorite <slug> 收藏');
      return;
    }
    console.log();
    printTable(['#', 'slug'], favs.map((s, i) => [String(i + 1), s]));
    console.log();
    return;
  }

  if (!slug) {
    await logErr('用法：taste-bank favorite <slug> | unfavorite <slug> | favorite --ls');
    process.exit(1);
  }

  const list = addFavorite(slug);
  await logOk(`已收藏 ${c.cyan(slug)}（共 ${list.length} 个）`);
}

export async function cmdUnfavorite(args) {
  const slug = args.find((a) => !a.startsWith('-'));
  if (!slug) {
    await logErr('用法：taste-bank unfavorite <slug>');
    process.exit(1);
  }
  const list = removeFavorite(slug);
  await logOk(`已取消收藏 ${c.gray(slug)}（剩余 ${list.length} 个）`);
}
