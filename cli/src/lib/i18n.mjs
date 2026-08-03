// i18n：zh/en 消息表 + %s 占位填充
// 对标飞书 install-wizard.js 的 messages 结构，但大幅精简（v1 命令少）

const messages = {
  zh: {
    // setup 向导
    setupTitle: '配置 Taste Bank',
    step1Name: '安装 taste-bank CLI',
    step1Installing: '正在全局安装 taste-bank...',
    step1Upgrade: '正在升级 taste-bank (v%s → v%s)...',
    step1Skip: '已安装最新版 (v%s)，跳过',
    step1Done: '已全局安装 v%s',
    step1Fail: '全局安装失败。手动重试：npm install -g taste-bank',
    step2Name: '注入 skill 到 agent',
    step2Spinner: '正在注入 skill...',
    step2Skip: 'skill 已注入，跳过',
    step2Done: 'skill 已注入到 agent',
    step2Fail: 'skill 注入失败。手动重试：npx skills add QuasarG/taste-bank -y -g',
    step2NodeTooOld: '检测到 Node v%s，skills 工具需要 ≥ 22.20.0。请先升级 Node，或跳过 skill 注入。',
    step3Name: '环境检测',
    setupDone: '配置完成！现在可以对 agent 说："用 taste-bank 里的风格做个页面"，或直接 taste-bank list',
    setupCancelled: '已取消',

    // doctor
    doctorTitle: 'Taste Bank 体检',
    doctorCli: 'taste-bank CLI',
    doctorSkill: 'skill 注入',
    doctorIdentity: '身份',
    doctorNetwork: '网络',

    // 通用
    networkOk: 'tastebank.cloud 可达',
    networkFail: 'tastebank.cloud 不可达（%s）',
    notConfigured: '未配置（运行 taste-bank setup）',
    yes: '是',
    no: '否',

    // 错误
    errStyleNotFound: '风格不存在：%s',
    errApiFail: '请求失败：%s',
  },
  en: {
    setupTitle: 'Set up Taste Bank',
    step1Name: 'Install taste-bank CLI',
    step1Installing: 'Installing taste-bank globally...',
    step1Upgrade: 'Upgrading taste-bank (v%s → v%s)...',
    step1Skip: 'Already installed (v%s). Skipped',
    step1Done: 'Installed globally v%s',
    step1Fail: 'Failed to install globally. Run manually: npm install -g taste-bank',
    step2Name: 'Inject skill into agents',
    step2Spinner: 'Injecting skill...',
    step2Skip: 'Skill already installed. Skipped',
    step2Done: 'Skill injected into agents',
    step2Fail: 'Failed to inject skill. Run manually: npx skills add QuasarG/taste-bank -y -g',
    step2NodeTooOld: 'Detected Node v%s; the skills tool requires ≥ 22.20.0. Upgrade Node, or skip skill injection.',
    step3Name: 'Environment check',
    setupDone: 'All set! Ask your agent: "use a taste-bank style to build a page", or run taste-bank list',
    setupCancelled: 'Cancelled',

    doctorTitle: 'Taste Bank Doctor',
    doctorCli: 'taste-bank CLI',
    doctorSkill: 'skill injection',
    doctorIdentity: 'identity',
    doctorNetwork: 'network',

    networkOk: 'tastebank.cloud reachable',
    networkFail: 'tastebank.cloud unreachable (%s)',
    notConfigured: 'not configured (run taste-bank setup)',
    yes: 'yes',
    no: 'no',

    errStyleNotFound: 'style not found: %s',
    errApiFail: 'request failed: %s',
  },
};

/** %s 占位填充，缺值退化为空串 */
export function fmt(template, ...values) {
  let i = 0;
  return template.replace(/%s/g, () => values[i++] ?? '');
}

/**
 * 取消息函数。语言自动探测（LC_ALL/LANG），--lang 参数覆盖。
 * 返回 { t, lang }：t(msgKey, ...args) 拿填充后的字符串
 */
export function getI18n(langOverride) {
  const lang = langOverride || detectLang();
  const table = messages[lang] || messages.en;
  return {
    lang,
    t: (key, ...args) => fmt(table[key] ?? messages.en[key] ?? key, ...args),
  };
}

function detectLang() {
  const env = (process.env.LC_ALL || process.env.LANG || process.env.LC_MESSAGES || '').toLowerCase();
  if (env.startsWith('zh')) return 'zh';
  return 'en';
}
