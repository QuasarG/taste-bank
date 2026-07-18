# Style Pack 规范

每套前端风格 = `styles/<slug>/` 下的一个目录，同时它本身也是一份合法的 agent skill。
本文件定义目录里必须有什么、每个文件给谁用、怎么用。

## 目录结构

```
styles/<slug>/
├── meta.json        # 必需。风格的元信息与使用规则
├── tokens.json      # 必需。全部设计变量，唯一事实来源
├── SKILL.md         # 必需。喂给 coding agent 的风格说明（带 frontmatter）
├── overrides.css    # 可选。变量表达不了的风格修饰，scoped 在 [data-style="<slug>"] 下
└── templates/       # 必需，至少 1 个 HTML 文件。原页面的「脱敏镜像」快照
    └── page.html    # 自包含（内联 CSS），可直接在浏览器打开
```

模板快照原则：**换词不换骨**——保留原页面的布局结构、组件丰富度与视觉细节，
但业务痕迹要三层清净：可见文案、代码命名（class/id）、组件组合的领域暗示，
全部换成中性词，以「旁观者猜不出原业务」为准。不要重写成通用演示页，
快照的价值就在于「长得就像原页面」。

`templates/` 里可以放任意前端形式的文件：HTML、CSS、Vue SFC、React 组件均可，
整套打包。agent 通过 `get_style_file` 逐个取走。

## meta.json 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| slug | `^[a-z0-9-]+$` | 必须与目录名一致 |
| name | string ≤60 | 展示名 |
| version | `x.y.z` | 语义化版本，改风格要升版本 |
| summary | string ≤200 | 一句话描述气质与适用面 |
| mood | string[] ≤8 | 情绪关键词，用于筛选 |
| useCase | string | 适合什么产品/页面 |
| signature | string | 这套风格被人记住的那一个元素 |
| rules.do / rules.dont | string[] | 正负约束。dont 对 agent 尤其重要 |
| rules.voice | string | 文案语气：按钮措辞、报错写法 |
| author / createdAt | string | 作者、日期 YYYY-MM-DD |

## tokens.json 结构

```jsonc
{
  "color":  { "bg": "...", "surface": "...", "text": "...", "muted": "...", "line": "...", "accent": "...", "...": "可扩展" },
  "font":   { "display": "字体栈", "body": "字体栈", "mono": "可选", "utility": "可选" },
  "size":   { "display": "...", "h1": "...", "h2": "...", "body": "...", "small": "...", "...": "可扩展" },
  "space":  { "sm": "...", "md": "...", "lg": "...", "...": "可扩展" },
  "radius": { "sm": "...", "md": "...", "...": "可扩展" },
  "shadow": { "card": "...", "...": "可扩展" },
  "motion": { "duration": "160ms", "easing": "cubic-bezier(...)" }
}
```

- color 必须含六个角色：`bg / surface / text / muted / line / accent`，其余随意扩展
- 颜色一律 hex；尺寸一律 `<数字><px|rem|em|%|vh|vw>`；shadow 允许 `"none"`
- **安全红线**：任何字符串值不得出现 `url(`、`@import`、`expression(`、`javascript:`、`<script`，schema 直接拒收
- **隐私红线**：skill / overrides / 模板内容命中高置信度密钥模式（私钥块、AKIA、GitHub PAT、`sk-`、JWT）直接拒收；
  语义隐私（项目名、公司名、域名、用户名）由投稿方按 SKILL.md 提炼工作流第 6 步脱敏

## SKILL.md 写作要求

frontmatter 必须有 `name` 与 `description`（agent 靠 description 判断何时用它）。
正文必含章节：概述 / 使用场景 / 设计要点 / Do & Don't / 文案语气 / 文件清单。

token 值不写进 SKILL.md 正文——库会自动把 tokens.json 生成的 CSS 变量块
追加为「## Tokens」附录，避免两处维护产生漂移。

## 投稿契约（submit_style / POST /api/styles.json）

```jsonc
{
  "meta": { "...": "同 meta.json" },
  "tokens": { "...": "同 tokens.json" },
  "skill": "SKILL.md 全文（markdown，含 frontmatter，≥50 字）",
  "overrides": "可选，同 overrides.css",
  "templates": { "page.html": "...", "extra.vue": "..." }
}
```

- `templates` 可选，但若提供必须至少含一个 `.html`；文件名限 `[\w.-]` + 白名单扩展名
- skill / overrides / 模板内容同样过危险片段黑名单（即模板禁止内嵌 `<script>`）
- slug 已存在时拒绝（409），覆盖更新请先升版本后走人工 git 流程

## 每个文件给谁用

| 文件 | 网站 | MCP / agent |
|---|---|---|
| meta.json | 画廊卡片、详情页头部 | `list_styles` / `get_style` |
| tokens.json | 生成 scoped CSS 渲染测试台 | `get_style`，及 SKILL.md 的 Tokens 附录 |
| SKILL.md | 详情页展示 + 一键复制 | `get_style_skill`（拼好附录后返回） |
| overrides.css | 注入测试台样式 | `get_style_file` |
| templates/* | 详情页文件清单可查看源码 | `get_style_file` |
