# Style Lab

个人前端风格库。每套风格是一个结构化 pack（SKILL.md + tokens + 模板文件），
网站负责展示与复制，HTTP API 与 MCP server 负责把风格直接递到 coding agent 手里。

## 快速开始

```bash
npm install
npm run dev       # 网站 + API：http://localhost:4321
npm test          # 全部测试（schema / store / assemble / create / API / MCP stdio / MCP HTTP）
npm run build     # 构建 SSR 服务到 dist/（本地验证用，部署另说）
npm run mcp       # MCP server · stdio 模式（本地 agent 挂这个）
npm run mcp:http  # MCP server · HTTP 模式，默认 http://127.0.0.1:3100/mcp
```

## 三条通路，一套逻辑

`src/lib/` 是唯一核心（schema 校验 / store 读取 / create 投稿 / assemble 组装），
网站、HTTP API、MCP（stdio + HTTP）都只是它的薄壳。

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

投稿（POST / submit_style）必须持邀请码，其余读取与更新/删除不需要。

- 邀请码由**客户端配置注入**，不属于投稿内容：HTTP 用头 `x-invite-code`，stdio 用环境变量 `STYLE_LAB_INVITE`
- 一码一身份：首次使用会与投稿的 `ownerPubkey` 绑定，之后仅该公钥可复用此码
- 库主管理：`npm run invite -- create [备注]`（只显示一次）/ `list` / `revoke <前缀>`
- 未配置有效码一律 403；邀请码文件在 `data/invite-codes.json`（仅存哈希）

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

签名规则：消息 = `style-lab:<update|delete>:<slug>:<timestamp>:<sha256(payload)>`，
ed25519 签名后 base64。update 的 payload 为 pack JSON 字符串，delete 为空串。
`npm run sign -- <私钥> <update|delete> <slug> [payload文件]` 可直接生成并打印 curl 示例。
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

库主本地调试可用 stdio（需要仓库 + Node）：

```json
{
  "mcpServers": {
    "style-lab": {
      "command": "node",
      "args": ["--import", "tsx", "mcp/server.ts"],
      "cwd": "/path/to/style-lab",
      "env": { "STYLE_LAB_INVITE": "sl_你的邀请码" }
    }
  }
}
```

HTTP 服务：`npm run mcp:http`，默认 `http://127.0.0.1:3100/mcp`（Streamable HTTP，无状态），
端口由 `STYLE_LAB_MCP_PORT` 控制。

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
