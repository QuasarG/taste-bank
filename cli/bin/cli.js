#!/usr/bin/env node
// taste-bank CLI 入口：分派子命令到 src/commands/*
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PKG = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
const VERSION = PKG.version;

const args = process.argv.slice(2);
const cmd = args[0];
const rest = args.slice(1);

// 无子命令或 --help/-h：打印帮助
if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
  printHelp();
  process.exit(0);
}

if (cmd === '--version' || cmd === '-v' || cmd === '-V') {
  console.log(`taste-bank v${VERSION}`);
  process.exit(0);
}

const COMMANDS = {
  setup: () => import('../src/setup.mjs').then((m) => m.runSetup(rest)),
  doctor: () => import('../src/doctor.mjs').then((m) => m.runDoctor(rest)),
  list: () => import('../src/commands/list.mjs').then((m) => m.cmdList(rest)),
  ls: () => import('../src/commands/list.mjs').then((m) => m.cmdList(rest)),
  show: () => import('../src/commands/show.mjs').then((m) => m.cmdShow(rest)),
  skill: () => import('../src/commands/skill.mjs').then((m) => m.cmdSkill(rest)),
  use: () => import('../src/commands/use.mjs').then((m) => m.cmdUse(rest)),
  // v0.2 投稿侧
  keygen: () => import('../src/commands/keygen.mjs').then((m) => m.cmdKeygen(rest)),
  whoami: () => import('../src/commands/whoami.mjs').then((m) => m.cmdWhoami(rest)),
  validate: () => import('../src/commands/validate.mjs').then((m) => m.cmdValidate(rest)),
  submit: () => import('../src/commands/submit.mjs').then((m) => m.cmdSubmit(rest)),
  update: () => import('../src/commands/update.mjs').then((m) => m.cmdUpdate(rest)),
  delete: () => import('../src/commands/delete.mjs').then((m) => m.cmdDelete(rest)),
  // v0.2 收藏
  favorite: () => import('../src/commands/favorite.mjs').then((m) => m.cmdFavorite(rest)),
  favorites: () => import('../src/commands/favorite.mjs').then((m) => m.cmdFavorite([...rest, '--ls'])),
  unfavorite: () => import('../src/commands/favorite.mjs').then((m) => m.cmdUnfavorite(rest)),
};

const handler = COMMANDS[cmd];
if (!handler) {
  console.error(`未知命令：${cmd}\n`);
  printHelp();
  process.exit(1);
}

handler().catch((err) => {
  // 命令内部会自行 process.exit；这里兜底防未捕获异常打难看堆栈
  console.error(err?.message || String(err));
  process.exit(1);
});

function printHelp() {
  const lines = [
    '',
    '  ████████╗░█████╗░░█████╗░██████╗░██████╗░░█████╗░████████╗',
    '  ╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝',
    '  ░░░╚██╗░░███████║███████║██████╔╝██║░░██║███████║░░░╚██╗░░',
    '  ░░░░╚██╗░██╔══██║██╔══██║██╔══██╗██║░░██║██╔══██║░░░░╚██╗░',
    '  ░░░░░╚██╗██║░░██║██║░░██║██║░░██║╚██████╔╝██║░░██║░░░░░╚██╗',
    '  ░░░░░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝░╚═════╝░╚═╝░░╚═╝░░░░░░╚═╝',
    '',
    '  the front-end style library for coding agents',
    '',
    '  用法：',
    '    taste-bank setup                  首次配置：全局装 CLI + 注入 skill 到 agent',
    '',
    '  消费：',
    '    taste-bank list [--q 词] [--json] 列出全部风格',
    '    taste-bank show <slug> [--json]   看某风格的详情（meta + tokens）',
    '    taste-bank skill <slug> [--md]    输出完整风格包 JSON（--md 切回纯文本）',
    '    taste-bank use <slug> [--as X]    把风格落地成项目规则文件',
    '                                      --as agents|claude|skill（默认 skill）',
    '    taste-bank favorite <slug>        收藏风格',
    '    taste-bank unfavorite <slug>      取消收藏',
    '    taste-bank favorites              列收藏',
    '',
    '  投稿：',
    '    taste-bank keygen                 生成 ed25519 密钥对（投稿身份）',
    '    taste-bank whoami                 查身份 + 名下风格 + 待审',
    '    taste-bank validate <pack.json>   干跑校验 pack（不发送）',
    '    taste-bank submit <pack.json>     投稿新风格（需邀请码 + 私钥）',
    '    taste-bank update <slug> <pack>   更新已有风格（需私钥）',
    '    taste-bank delete <slug>          删除风格（需私钥）',
    '',
    '  其他：',
    '    taste-bank doctor                 体检：CLI/网络/身份/skill/缓存',
    '    --version, -v                     打印版本号',
    '    --help, -h                        本帮助',
    '',
    '  首次使用？运行：npx taste-bank setup',
    '  浏览风格：https://tastebank.cloud',
    '',
  ];
  for (const l of lines) console.log(l);
}
