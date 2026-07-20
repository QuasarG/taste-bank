# Style Lab

个人前端风格库。每套风格是一个结构化 pack（SKILL.md + tokens + 模板文件），
网站负责展示与复制，HTTP API 与 MCP server 负责把风格直接递到 coding agent 手里。

## 快速开始

```bash
npm install
npm run dev       # 网站 + API：http://localhost:4321
npm test          # 全部测试（schema / store / assemble / create / API / MCP HTTP）
npm run build     # 构建 SSR 服务到 dist/（本地验证用，部署另说）
npm run mcp:http  # MCP server · HTTP 模式，默认 http://127.0.0.1:3100/mcp
```

## 三条通路，一套逻辑

`src/lib/` 是唯一核心（schema 校验 / store 读取 / create 投稿 / assemble 组装），
网站、HTTP API、MCP（Streamable HTTP）都只是它的薄壳。

## HTTP API

| 端点 | 说明 |
|---|---|
| `GET /api/styles.json` | 风格列表，`?q=关键词` 过滤 |
| `GET /api/styles/:slug.json` | meta + tokens + 文件清单 |
| `GET /api/styles/:slug/skill.md` | 组装好的 SKILL.md（text/markdown） |
| `GET /api/styles/:slug/tokens.css` | tokens 生成的 scoped CSS（含 overrides） |
| `POST /api/styles.json` | 投稿，body 见下，**头 `x-invite-code` 必填**；201 / 409 / 400 / 403 |
| `PUT /api/styles/:slug.json` | 更新（需签名，version 必须递增） |
| `DELETE /api/styles/:slug.json` | 删除（需签名） |
| `GET /api/styles/:slug/screenshot.png` | 模板截图（Chromium 渲染，内容哈希缓存） |

## 邀请制投稿

投稿（POST / submit_style）必须同时满足：**邀请码**（门票）+ **私钥签名**（本人证明），
并进入**审核队列**，库主 approve 后才上架。

- 邀请码由**客户端配置注入**，不属于投稿内容：HTTP 头 `x-invite-code`
- 一码一身份：首次使用会与投稿的 `ownerPubkey` 绑定，之后仅该公钥可复用此码
- 投稿签名：消息 = `style-lab:submit:<slug>:<timestamp>:<sha256(payload)>`，
  HTTP 走 `x-timestamp` / `x-signature` 头，MCP 走同名参数
- 审核：`npm run review -- list / approve <slug> / reject <slug>`，
  队列落 `data/pending/`，approve 后迁入 `styles/`
- 限流：投稿按公钥 20 次/分，更新删除按 slug 30 次/分，MCP 按来源 IP 120 次/分
- 库主管理邀请码：`npm run invite -- create [备注]`（只显示一次）/ `list` / `revoke <前缀>`
- 未配置有效码或签名无效一律 403；邀请码文件在 `data/invite-codes.json`（仅存哈希）

POST body：

```jsonc
{
  "meta": { "slug": "...", "name": "...", "...": "见 docs/SPEC.md" },
  "tokens": { "color": { "bg": "#...", "...": "..." }, "...": "..." },
  "skill": "# SKILL.md 全文（≥50 字）",
  "overrides": "可选 css",
  "templates": { "page.html": "<!DOCTYPE html>..." },
  "ownerPubkey": "可选，ed25519 公钥 base64；登记所有权（邀请制下必填）"
}
```

## 公钥管理（无登录更新/删除）

投稿时可选带 `ownerPubkey`（ed25519 公钥，base64）登记所有权。
登记后仅持有对应私钥者可管理该风格；未登记的风格任何人都不可更新/删除。

```bash
npm run keygen   # 生成钥匙对（公钥投稿用，私钥本地保管；需本地 Node + 仓库）
```

没有本地仓库/Node 时：调 MCP 的 `generate_keypair` 工具（私钥会经过 MCP 连接传输，慎用），
或任意 ed25519 工具，产出 base64 DER 格式即可（私钥 pkcs8 / 公钥 spki）。

**私钥持久化约定**：用户主目录下 `.style-lab/private.key` + `public.key`
（Linux/macOS 即 `~/.style-lab/`，Windows 即 `C:\Users\<用户名>\.style-lab\`）。
agent 每次会话先查该文件，存在则复用绝不重新生成；用户负责备份，且不得提交进 git。

签名规则：消息 = `style-lab:<submit|update|delete>:<slug>:<timestamp>:<sha256(payload)>`，
ed25519 签名后 base64。submit/update 的 payload 为 pack JSON 字符串，delete 为空串。
`npm run sign -- <私钥> <action> <slug> [payload文件]` 可直接生成并打印 curl 示例。
无仓库时用任意 ed25519 实现自行签名（SKILL.md 内有自包含脚本）。

- HTTP：`PUT /api/styles/:slug.json`（body=payload，头 `x-timestamp` / `x-signature`）、
  `DELETE /api/styles/:slug.json`（同头部）
- MCP：`update_style` / `delete_style` 工具，参数同义
- 规则：version 必须大于现有版本；timestamp 窗口 5 分钟；所有权跨更新自动保留

## MCP 接入

**对外用户只需要一条 URL**（无需克隆仓库、无需本地 Node）：

```json
{
  "mcpServers": {
    "style-lab": {
      "url": "http://<host>:3100/mcp",
      "headers": { "x-invite-code": "sl_你的邀请码" }
    }
  }
}
```

HTTP 服务：`npm run mcp:http`，默认 `http://127.0.0.1:3100/mcp`（Streamable HTTP，无状态），
端口由 `STYLE_LAB_MCP_PORT` 控制。库主与外部用户使用同一份配置。

工具：`list_styles` / `get_style` / `get_style_skill` / `get_style_css` /
`get_style_file` / `get_usage_guide` / `submit_style` / `update_style` / `delete_style` / `generate_keypair`。
用法说明本身也是一份 skill（根目录 `SKILL.md`），agent 可通过 `get_usage_guide` 获取。

## 新增风格

两条路：按 `docs/SPEC.md` 手写目录放进 `styles/`；或让 agent 调
`submit_style` / `POST /api/styles.json`。两条路都过同一份 zod 校验。
改已有风格记得升 version。

## 环境变量

| 变量 | 默认 | 用途 |
|---|---|---|
| `STYLE_LAB_DIR` | 项目根 | 指向包含 `styles/` 的目录，测试/多实例隔离用 |
| `STYLE_LAB_MCP_PORT` | 3100 | MCP HTTP 端口 |
| `STYLE_LAB_MCP_HOST` | 127.0.0.1 | MCP 绑定地址，公网暴露设 `0.0.0.0` |
| `CHROMIUM_PATH` | /usr/bin/chromium | 截图用 Chromium 可执行文件路径 |
| `STYLE_LAB_ADMIN_TOKEN` | 空（管理台关闭） | 审核管理台口令，设置后 `/admin` 可用 |

## 审核管理台

设置 `STYLE_LAB_ADMIN_TOKEN` 后访问 `/admin`，口令登录（Cookie 7 天），
可查看待审列表、预览模板、阅读 SKILL.md，并 approve / reject。
未设置该变量时管理台整体关闭（所有 admin 端点 403）。

| 端点 | 说明 |
|---|---|
| `GET/POST/DELETE /api/admin/session.json` | 探测登录态 / 口令登录（发 Cookie）/ 退出 |
| `GET /api/admin/pending.json` | 待审列表 |
| `GET /api/admin/pending/:slug.json` | 待审详情（meta + skill + 文件清单） |
| `POST /api/admin/pending/:slug/approve.json` | 通过并上架 |
| `POST /api/admin/pending/:slug/reject.json` | 拒绝并清除 |
| `GET /pending/:slug/template.html` | 待审模板预览（与公开路由同一份 CSP） |

管理端点接受 `x-admin-token` 头或登录 Cookie；变更类请求请带 `content-type: application/json`
（Astro 的 checkOrigin 会拦无 content-type 的跨源 POST）。

## 生产部署

两个进程：网站（Astro standalone）+ MCP HTTP，共享同一个 `STYLE_LAB_DIR`。

```bash
npm ci --omit=dev
npm run build
# 网站：HOST / PORT 控制监听（默认 0.0.0.0:4321）
HOST=0.0.0.0 PORT=4321 STYLE_LAB_DIR=/srv/style-lab npm start
# MCP：另起一个进程
STYLE_LAB_MCP_HOST=0.0.0.0 STYLE_LAB_DIR=/srv/style-lab npm run mcp:http
```

- **持久化**：`STYLE_LAB_DIR` 指向代码树外的目录（如 `/srv/style-lab`，内含 `styles/` 与 `data/`），
  邀请码、审核队列、截图缓存、已上架风格全在里面，重新部署不受影响
- **Chromium**：截图端点运行时需要系统 Chromium（Debian/Ubuntu：`apt install chromium`），
  路径不同用 `CHROMIUM_PATH` 指定；缺失时仅截图端点不可用，其余功能不受影响
- **管理操作**：`npm run review` / `npm run invite` 在服务器上执行，走同一个 `STYLE_LAB_DIR`；
  审核也可走 Web 管理台 `/admin`（需 `STYLE_LAB_ADMIN_TOKEN`）
- **安全提示**：MCP 裸 HTTP 暴露时邀请码在请求头明文传输，有域名后应套 HTTPS 反代
  （届时 admin Cookie 可补 `Secure` 标志）
