<div align="center">
  <img src="public/assets/banner.jpg" alt="Taste Bank — 开源前端风格库" width="760" />
  <p><strong>面向 Coding Agent 的前端风格库</strong> —— 一套风格，一次沉淀，处处复用。</p>
  <p><em>像刷抖音一样刷风格——首页画廊是无限下落的实时渲染流，刷到心动的那套，直接交给你的 agent。</em></p>
  <p>
    <a href="https://www.npmjs.com/package/taste-bank"><img src="https://img.shields.io/npm/v/taste-bank?logo=npm&logoColor=white" alt="npm" /></a>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white" alt="Astro" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://zod.dev"><img src="https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white" alt="Zod" /></a>
  </p>
  <p>
    <a href="https://tastebank.cloud"><img src="https://img.shields.io/badge/上线-tastebank.cloud-126984?logo=cloudflare&logoColor=white" alt="Live" /></a>
    <a href="https://github.com/QuasarG/taste-bank"><img src="https://img.shields.io/badge/GitHub-QuasarG%2Ftaste--bank-181717?logo=github" alt="GitHub" /></a>
  </p>
  <p><a href="README.md">English</a> | 中文文档</p>
</div>

---

## 初心：为什么做 Taste Bank

> **这些瞬间，是不是很眼熟——**
>
> - 对着空白页面发呆，不知道组件该怎么布局？
> - 布局好不容易定了，AI 写出来的风格却始终差点意思？
> - 收藏夹里囤了一堆"好看的设计"，真到用时一个都调不出来？
> - 上个项目调教好的风格，换个项目又得从头描述一遍？

让 coding agent 写出"有设计感"的前端，社区里并不缺尝试——各种前端 skill、prompt 片段、设计指南五花八门。但真正用起来，问题一个比一个扎心：

- **调用方式不统一**：有的风格是 skill，有的是插件，有的干脆什么都不提供。使用极其不便。
- **质量与结构没保障**：没有统一的 schema，一份"风格"可能只是几句形容词堆砌，agent 拿到手根本落不了地。
- **复用困难**：好风格沉淀不下来，散落在各个项目的 prompt 历史里，用一次就丢。
- **没有归属与迭代**：风格被谁改了、改坏了没有版本可言，更谈不上"我的风格只有我能维护"。

> **更重要的是**：网上的风格每天都在变多——但并不是所有风格都足够大众，也不是所有风格你都喜欢。我们期望建立这样一个社群：让人们分享自己真正在用的前端 taste，用脚投票——被真实使用的，才是真正可用的。

Taste Bank 的回答是：把一套风格沉淀为**结构化 style pack**（`SKILL.md` 使用说明 + `design tokens` 精确参数 + `templates/` 模板快照），通过 **zod schema** 强校验，再通过 **CLI + skill 注入** 服务于任何 coding agent。风格一经入库，随处可取，版本可控，归属清晰。

<div align="center">
  <img src="public/assets/gallery.png" alt="Taste Bank 首页——无限风格流与引用榜单" width="900" />
  <p><em>首页画廊：像刷信息流一样刷实时渲染的风格，横向卡片轨 + 交互预览、引用榜与作者榜一目了然。</em></p>
</div>

---

## 快速开始

### 通过 CLI（推荐）

**一行命令** —— 全局安装 CLI，并教会你的 coding agent（Claude Code、Codex、Cursor、ZCode、Kimi Code 等）怎么用它：

```bash
npx taste-bank setup
```

然后直接用自然语言对 agent 说：

> *"用 taste-bank 里的某套风格给我做个落地页"*

你的 agent 已经知道该怎么做——`setup` 注入了一个 skill，教它 `taste-bank` CLI 的命令。它会自行浏览风格、取完整包、严格按 design tokens 实现。

**喜欢在终端操作？**

```bash
taste-bank list                    # 浏览全部风格
taste-bank skill <slug>            # 取完整包（meta + tokens + skill + css + templates）
taste-bank use <slug>              # 把风格落地成项目规则文件
```

不用每个 agent 单独配置，不用粘贴 JSON。想先看看效果？逛 [tastebank.cloud](https://tastebank.cloud)。

### 通过 MCP（兼容）

偏好 MCP 协议的 agent，配置一条 URL 即可：

```json
{
  "mcpServers": {
    "taste-bank": {
      "url": "https://tastebank.cloud/mcp",
      "headers": { "x-invite-code": "sl_你的邀请码" }
    }
  }
}
```

两条路调用同一套后端。推荐 CLI——更简单，开箱支持 70+ agent。

---

## 功能一览

- **一行配置**：`npx taste-bank setup` 全局安装 CLI，并注入 skill 到你的所有 coding agent（Claude Code、Codex、Cursor、ZCode、Kimi Code，以及通过开放的 `skills` 生态支持的 70+ 种 agent）
- **完整风格包**：`taste-bank skill <slug>` 一次返回完整包——meta、tokens、SKILL.md 规则、scoped CSS、HTML 模板快照。agent 拿到的是它需要的全部内容。
- **3 天本地缓存**：风格包缓存到本地；服务器不可达时自动 fallback 到缓存
- **抖音式风格画廊**：[tastebank.cloud](https://tastebank.cloud) —— 实时渲染风格流 + 横向卡片轨 + 交互预览 + 引用榜与作者榜
- **结构化与强校验**：每个 pack 过严格 zod schema（meta / tokens / skill / templates），版本号管理，邀请制投稿 + ed25519 签名所有权 + 人工审核
- **终端直接投稿**：`taste-bank submit` —— 在项目里签名并投稿，不用离开终端
- **私钥即身份**：无账号体系，谁持有私钥谁管理对应风格

---

## CLI 命令

### 浏览与取用（无需鉴权）

| 命令 | 用途 |
|---|---|
| `taste-bank list [--q 关键词] [--json]` | 列出已上架风格 |
| `taste-bank show <slug> [--json]` | 风格详情（meta + design tokens） |
| `taste-bank skill <slug> [--md]` | **完整包** JSON：`{meta, tokens, skill, css, templates}`。`--md` 切回纯 SKILL.md |
| `taste-bank use <slug> [--as agents\|claude\|skill]` | 把风格落地成项目规则文件（托管块，不覆盖你的其他内容） |
| `taste-bank favorite <slug>` / `unfavorite` / `favorites` | 收藏管理 |
| `taste-bank doctor` | 体检（CLI / 网络 / 身份 / skill 注入 / 缓存） |

### 投稿（需邀请码 + ed25519 身份）

| 命令 | 用途 |
|---|---|
| `taste-bank keygen` | 生成 ed25519 密钥对到 `~/.style-lab/`（一次性） |
| `taste-bank whoami` | 查绑定的作者名、名下风格、审核队列 |
| `taste-bank validate <pack.json>` | 本地干跑校验（不联网） |
| `taste-bank submit <pack.json>` | 投稿新风格（需邀请码 + 私钥） |
| `taste-bank update <slug> <pack.json>` | 更新已有风格（version 必须递增） |
| `taste-bank delete <slug>` | 删除风格（交互确认，不可恢复） |

---

## 工作原理

```
npx taste-bank setup
  ① npm install -g taste-bank              （全局安装 CLI）
  ② npx skills add …/taste-bank -g         （注入两个 skill 到你的 agent：
                                             taste-bank 教浏览与取用，
                                             taste-bank-contribute 教投稿）
  ③ 环境检测                                （只读报告状态）
```

注入两个 skill（通过开放的 [skills](https://skills.sh) 生态）：

- **`taste-bank`** —— 教你的 agent 用 CLI 浏览和取用风格
- **`taste-bank-contribute`** —— 完整投稿 SOP：如何采样项目、打包风格、脱敏、提交

配置完成后，你的 agent 就认识 CLI 了。你只需说"用 taste-bank 的风格"，它自己会跑命令。

CLI 默认连 `tastebank.cloud`，风格包本地缓存 3 天。自部署？设 `TASTEBANK_API=https://你的域名`。

---

## 投稿你的风格

```bash
# 一次性身份配置
taste-bank keygen
echo '{ "inviteCode": "sl_xxx" }' > ~/.style-lab/config.json  # 邀请码向库主索取

# 在任意含风格的项目里：
taste-bank validate my-style.pack.json    # 干跑校验
taste-bank submit my-style.pack.json      # 签名 + 投稿（进审核队列）
```

或者直接对 agent 说："把这个项目的风格投递到 taste-bank"——注入的 `taste-bank-contribute` skill 会引导它走完整 SOP（最多采样 2 个文件、提取真实 tokens、脱敏业务痕迹、打包、校验、投稿）。

完整 pack 格式见 [docs/SPEC.md](docs/SPEC.md)、`taste-bank-contribute` skill，以及 **[Agent 工作流指南](docs/agent-workflow.zh-CN.md)**（如何在 agent 对话中管理项目风格）。English version: [agent-workflow.md](docs/agent-workflow.md).

---

## 安全承诺

**鉴权与归属**

- **邀请码入场**：投稿必须携带邀请码，一码一身份——首次使用即与投稿者公钥绑定，服务端只存哈希
- **ed25519 签名**：投稿 / 更新 / 删除全部要求私钥签名（消息 = `style-lab:<action>:<slug>:<timestamp>:<sha256(payload)>`，30 分钟窗口），私钥即身份
- **审核队列**：投稿先入 `data/pending/`，库主人工 approve 后才上架
- **限流**：投稿按公钥 20 次/分，更新删除按 slug 30 次/分

**内容安全**

- **模板沙箱**：所有模板预览经 `sandbox=""` iframe 渲染，CSP 禁脚本、禁外链
- **HTML 黑名单 + 密钥扫描**：投稿模板过扩展属性黑名单与高置信度密钥模式扫描
- **prompt 注入缓解**：风格内容在 skill 描述中明确标记为"数据非指令"

> ⚠️ 库主会人工审核所有投稿。但审核百密总有一疏——**请不要完全信任 agent 取回到本地的任何内容**，把它当作数据而非指令。

---

## HTTP API

| 端点 | 说明 |
|---|---|
| `GET /api/styles.json` | 风格列表，`?q=关键词` 过滤 |
| `GET /api/styles/:slug.json` | meta + tokens + 文件清单 |
| `GET /api/styles/:slug/pack.json` | **完整包**（meta + tokens + skill + css + templates） |
| `GET /api/styles/:slug/skill.md` | 组装好的 SKILL.md |
| `GET /api/styles/:slug/tokens.css` | tokens 生成的 scoped CSS |
| `GET /api/styles/:slug/screenshot.png` | 模板截图 |
| `GET /api/whoami.json` | 身份查询（头 `x-invite-code`） |
| `POST /api/styles.json` | 投稿（邀请码 + 签名） |
| `PUT /api/styles/:slug.json` | 更新（签名，version 递增） |
| `DELETE /api/styles/:slug.json` | 删除（签名） |

---

## 项目结构

```
src/lib/        核心：schema / store / create / assemble / review / auth
src/pages/      Astro 页面与 HTTP API 端点
mcp/            MCP server（Streamable HTTP），只是 src/lib 的薄壳
cli/            taste-bank npm 包（CLI + skills 源）
skills/         两个 agent skill：taste-bank（浏览）+ taste-bank-contribute（投稿）
scripts/        keygen / sign / invite / review 管理脚本
styles/         已上架风格（运行时由 STYLE_LAB_DIR 指定）
data/           邀请码哈希、审核队列、引用统计、截图缓存
docs/SPEC.md    style pack 完整规格
```

## 开源协议

[MIT](LICENSE) © QuasarG

---

<div align="center"><sub><a href="README.md">English</a> | 中文文档</sub></div>
