<div align="center">
  <img src="public/assets/banner.jpg" alt="Taste Bank — Open Source Design Styles" width="760" />
  <p><strong>面向 Coding Agent 的前端风格库</strong> —— 一套风格，一次沉淀，处处复用。</p>
  <p><em>像刷抖音一样刷风格——首页画廊是无限下落的实时渲染流，刷到心动的那套，直接交给你的 agent。</em></p>
  <p>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white" alt="Astro" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white" alt="Node.js" /></a>
    <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Streamable_HTTP-111516" alt="MCP" /></a>
    <a href="https://zod.dev"><img src="https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white" alt="Zod" /></a>
  </p>
  <p><a href="README.md">English</a> | 中文文档</p>
</div>

---

## 初心：为什么做 Taste Bank

让 coding agent 写出"有设计感"的前端，社区里并不缺尝试——各种前端 skill、prompt 片段、设计指南五花八门。但真正用起来，问题一个比一个扎心：

- **调用方式不统一**：有的是一段要手动复制的 Markdown，有的是口耳相传的 prompt 技巧，有的藏在某个项目的 `.agents/` 里。换个工具、换个 agent，用法全得重学一遍。
- **质量与结构没保障**：没有统一的 schema，一份"风格"可能只是几句形容词堆砌，agent 拿到手根本落不了地。
- **复用困难**：好风格沉淀不下来，散落在各个项目的 prompt 历史里，用一次就丢。
- **跨项目迁移困难**：在 A 项目调教好的风格，到了 B 项目要重新描述一遍，视觉意图在转述中损耗殆尽。
- **没有归属与迭代**：风格被谁改了、改坏了没有版本可言，更谈不上"我的风格只有我能维护"。

Taste Bank 的回答是：把一套风格沉淀为**结构化 style pack**（`SKILL.md` 使用说明 + `design tokens` 精确参数 + `templates/` 模板快照），通过 **zod schema** 强校验，再提供三条共用同一套核心逻辑的通路——**Web 画廊**给人看，**HTTP API** 给脚本用，**MCP server** 把风格直接递到任何 coding agent 手里。风格一经入库，随处可取，版本可控，归属清晰。

> **和市面上其他前端社群的不同**：他们收藏好看的风格，我们让风格**即刻可调**。别的画廊虽然在逐渐壮大，但风格躺在长篇散文式的描述里，你得自己读、自己翻译、自己喂给工具。在这里你不用跟描述搏斗——只要用自然语言告诉 agent"我想要那套蓝图风格"，MCP server 就会把机器可读、可直接执行的风格包交到它手上。

## 功能一览

- **抖音式风格画廊**：首页是无限下落的实时渲染风格流——像刷短视频一样往下刷，刷到心动的那套就翻进轮盘模式细看；Collections 页提供带分类与分页的全览网格
- 引用榜单：每次 agent 取用风格都会计数，首页展示风格引用榜与作者榜
- 结构化 style pack：meta / tokens / SKILL.md / overrides / templates，zod 全量校验，版本号管理
- MCP server（Streamable HTTP）：10 个工具覆盖浏览、取用、投稿、更新、删除、钥匙生成
- HTTP API：列表 / 详情 / SKILL 组装 / scoped CSS / 截图 / 投稿 / 更新 / 删除
- 邀请制投稿 + ed25519 签名所有权 + 审核队列 + Web 审核管理台（`/admin`）
- 私钥即身份：无账号体系，谁持有私钥谁管理对应风格

## Quick Start

### 1. 浏览主页（给人看）

部署后的站点入口：

| 页面 | 内容 |
|---|---|
| `/` | 沉浸式翻阅：左侧实时渲染风格模板，右缘滚轮召唤轮盘，停滚自动切换 |
| `/collections` | 全览网格：所有已上架风格的目录与参考图 |
| `/about` | 项目理念 + **MCP 工具完整使用指南** |
| `/admin` | 审核管理台（仅库主，见下文） |

每套风格卡片可以复制 SKILL.md 或 scoped CSS，但推荐姿势是把风格直接送进 agent——

### 2. 接入 MCP（给 agent 用）

无需克隆仓库、无需本地 Node，只要一条 URL。在你的 MCP 客户端（Kimi Code / Claude Code / Cursor 等）配置中加入：

```json
{
  "mcpServers": {
    "taste-bank": {
      "url": "http://<host>:3100/mcp",
      "headers": { "x-invite-code": "sl_你的邀请码" }
    }
  }
}
```

> 只读浏览（`list_styles` 等）不需要邀请码；投稿（`submit_style`）必须携带。**邀请码请联系仓库所有者获取**（见 [GitHub](https://github.com/QuasarG/taste-bank)）。
>
> 不知道怎么配 MCP？把上面这段 JSON 直接复制丢给你的 agent，说一句"帮我配置这个 MCP server"，它会自己装好的。

然后直接对 agent 说人话，比如"用 taste-bank 里的某套风格给我做个落地页"。agent 会自行完成：调 `list_styles` 挑风格 → `get_style_skill` 取完整使用说明 → 严格按 tokens 实现。

工具速查（完整用法见站点 `/about` 页，agent 也可调 `get_usage_guide` 自取）：

| 分组 | 工具 | 用途 |
|---|---|---|
| 浏览 | `list_styles` / `get_style` / `get_style_css` / `get_style_file` | 挑风格、读参数、取 CSS、看模板 |
| 取用 | `get_style_skill` | 取组装好的 SKILL.md，粘贴给任意 coding agent 即可按风格实现 |
| 投稿 | `submit_style` | 提交新风格（需邀请码 + 签名，进审核队列） |
| 管理 | `update_style` / `delete_style` | 迭代或下架**自己**的风格（需私钥签名） |
| 钥匙 | `generate_keypair` | 生成 ed25519 钥匙对（所有权凭证） |

## 安全承诺

Taste Bank 允许任何人凭邀请码投稿、允许 agent 读取任意风格内容，因此从鉴权到内容安全做了全链路设计：

**鉴权与归属**

- **邀请码入场**：投稿必须携带 `x-invite-code`，一码一身份——首次使用即与投稿者公钥绑定，此后仅该公钥可复用此码；服务端只存邀请码哈希
- **ed25519 签名**：投稿 / 更新 / 删除全部要求私钥签名（消息 = `style-lab:<action>:<slug>:<timestamp>:<sha256(payload)>`，5 分钟时间窗），私钥即身份，无密码可泄露
- **审核队列**：投稿先入 `data/pending/`，库主在 `/admin` 管理台 approve 后才上架；reject 即焚毁
- **限流**：投稿按公钥 20 次/分，更新删除按 slug 30 次/分，MCP 按来源 IP 120 次/分

**内容安全**

- **模板沙箱**：所有模板预览经 `sandbox=""` iframe 渲染，CSP 禁脚本、禁外链，模板不可能跳出画布做任何事
- **HTML 黑名单校验**：投稿模板过扩展属性黑名单，危险标记直接拒收
- **prompt 注入缓解**：风格内容在工具描述中被明确标记为"数据非指令"，防止恶意风格劫持 agent 行为
- **路径逃逸防护**：所有文件读取经路径归一化校验，`../` 类逃逸一律拒绝
- **密钥模式扫描**：投稿内容命中高置信度密钥模式（API key 等）直接服务端拒收

## 用 MCP 管理自己的风格

你投稿的每一套风格都归你所有，可以随意增删改查、持续迭代版本，全程不需要账号密码——**私钥就是所有权**。

> **为什么是钥匙而不是账号？**这是刻意的设计：为了尽可能多地保护提交人的隐私，同时降低服务器的存储负担，Taste Bank 采用公私钥体系来识别和鉴权，而不是账号系统。没有邮箱、没有密码、没有用户表——服务端没有可存储的个人信息，自然也没有可泄露的。代价只有一条：**请绝对保管好自己的私钥**——它是风格属于你的唯一凭证。

**第一次：领钥匙**

让 agent 调 `generate_keypair`（或本地 `npm run keygen`），得到一对 ed25519 钥匙：

- 公钥 `ownerPubkey`：投稿时随包提交，用于登记所有权
- 私钥：**立即持久化到** `~/.style-lab/private.key`（Windows 为 `C:\Users\<用户名>\.style-lab\`），并自行备份。私钥只存在于当前会话，丢失即永久失去对该风格的管理权，无法找回。agent 每次会话应先查该文件，存在则复用，绝不重复生成

**投稿**：调 `submit_style`，payload 含 meta / tokens / skill / templates / ownerPubkey，附签名。过审前对外不可见，库主 approve 后上架。

**迭代**：调 `update_style`，`version` 必须大于现有版本（如 `1.0.0` → `1.1.0`），所有权跨更新自动保留。

**下架**：调 `delete_style`，签名验证通过后即刻移除，不可恢复。

> 没有本地仓库时，签名可用 SKILL.md 内附的自包含脚本完成；有仓库时 `npm run sign -- <私钥> <action> <slug> [payload文件]` 会直接打印可执行的 curl 示例。

## HTTP API

| 端点 | 说明 |
|---|---|
| `GET /api/styles.json` | 风格列表，`?q=关键词` 过滤 |
| `GET /api/styles/:slug.json` | meta + tokens + 文件清单 |
| `GET /api/styles/:slug/skill.md` | 组装好的 SKILL.md（text/markdown） |
| `GET /api/styles/:slug/tokens.css` | tokens 生成的 scoped CSS（含 overrides） |
| `GET /api/styles/:slug/screenshot.png` | 模板截图（Chromium 渲染，内容哈希缓存） |
| `POST /api/styles.json` | 投稿（头 `x-invite-code` 必填 + 签名头）；201 / 409 / 400 / 403 |
| `PUT /api/styles/:slug.json` | 更新（需签名，version 必须递增） |
| `DELETE /api/styles/:slug.json` | 删除（需签名） |

POST body 结构：

```jsonc
{
  "meta": { "slug": "...", "name": "...", "...": "见 docs/SPEC.md" },
  "tokens": { "color": { "bg": "#...", "...": "..." }, "...": "..." },
  "skill": "# SKILL.md 全文（≥50 字）",
  "overrides": "可选 css",
  "templates": { "page.html": "<!DOCTYPE html>..." },
  "ownerPubkey": "ed25519 公钥 base64，登记所有权（邀请制下必填）"
}
```

## 项目结构

```
src/lib/        唯一核心：schema 校验 / store 读取 / create 投稿 / assemble 组装 / review 审核
src/pages/      Astro 页面与 HTTP API 端点（含 /api/admin 审核端点）
mcp/            MCP server（Streamable HTTP），只是 src/lib 的薄壳
scripts/        keygen / sign / invite / review 四个管理脚本
styles/         已上架风格（运行时由 STYLE_LAB_DIR 指定）
data/           邀请码哈希、审核队列、截图缓存
docs/SPEC.md    style pack 完整规格
```

---

<div align="center"><sub><a href="README.md">English</a> | 中文文档</sub></div>
