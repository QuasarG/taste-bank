# Style Lab

anonymous 的个人前端风格库。每套风格是一个结构化 pack（SKILL.md + tokens + 模板文件），
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
| `POST /api/styles.json` | 投稿，body 见下；成功 201，冲突 409，校验失败 400 |

POST body：

```jsonc
{
  "meta": { "slug": "...", "name": "...", "...": "见 docs/SPEC.md" },
  "tokens": { "color": { "bg": "#...", "...": "..." }, "...": "..." },
  "skill": "# SKILL.md 全文（≥50 字）",
  "overrides": "可选 css",
  "templates": { "page.html": "<!DOCTYPE html>..." }
}
```

## MCP 接入

stdio（本地 agent 推荐）：

```json
{
  "mcpServers": {
    "style-lab": {
      "command": "node",
      "args": ["--import", "tsx", "mcp/server.ts"],
      "cwd": "/mnt/c/Users/anonymous/projects/style-lab"
    }
  }
}
```

HTTP（远程 agent / 多客户端共享）：`npm run mcp:http` 后接入
`http://<host>:3100/mcp`（Streamable HTTP，无状态）。端口由 `STYLE_LAB_MCP_PORT` 控制。

工具：`list_styles` / `get_style` / `get_style_skill` / `get_style_css` /
`get_style_file` / `get_usage_guide` / `submit_style`。
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
