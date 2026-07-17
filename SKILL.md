---
name: style-lab
description: anonymous 的个人前端风格库。通过 MCP 工具（或本地文件）获取风格 pack——含 SKILL.md、tokens、模板文件——让任意 coding agent 复现统一的前端风格。当用户要求使用其个人风格库中的风格实现前端时使用。
---

# Style Lab 使用说明

这是一座前端风格库：每套风格是一个结构化 pack（见 `docs/SPEC.md`），
本 skill 说明 agent 应当如何取用它们。

## 推荐工作流

1. `list_styles` —— 浏览全部风格的 slug、情绪关键词、适用场景，与用户确认选哪套
2. `get_style_skill` —— 拿到该风格组装好的 SKILL.md（正文 + Tokens 附录），
   **把全文放进你的上下文**，后续实现严格遵循其中的 Do / Don't 与变量值
3. `get_style_file` —— 按需取模板文件（如 `templates/page.html`）作为实现参照
4. 实现时颜色/字体/间距只允许取 Tokens 附录中的变量值，禁止自由发挥

## MCP 工具一览

| 工具 | 用途 |
|---|---|
| `list_styles` | 列出全部风格（slug / 名称 / mood / useCase） |
| `get_style` | 取某风格的 meta + tokens 原始 JSON |
| `get_style_skill` | 取组装好的 SKILL.md 全文，可直接粘贴给任何 agent |
| `get_style_css` | 取 tokens 生成的 scoped CSS（含 overrides），可直接注入页面 |
| `get_style_file` | 取 pack 内任意文件（模板、overrides.css 等） |
| `get_usage_guide` | 返回本说明 |
| `submit_style` | 投稿新风格（meta + tokens + skill + 可选 overrides/templates），校验通过即收录 |

## HTTP API（与 MCP 等价）

`GET /api/styles.json`、`GET /api/styles/:slug.json`、`GET /api/styles/:slug/skill.md`、
`GET /api/styles/:slug/tokens.css`、`POST /api/styles.json`（投稿，body 同 submit_style 参数）。
不支持 MCP 的 agent 直接 curl 即可。

## 没有 MCP 时

风格库就是一个普通目录：`styles/<slug>/` 下直接读 `SKILL.md` 与 `tokens.json`，
效果相同。网站（`npm run dev`）提供可视化测试台与一键复制。

## 新增风格

手写：按 `docs/SPEC.md` 在 `styles/` 下新建目录即可，网站与 MCP 自动收录。
投稿：调 `submit_style` 工具或 `POST /api/styles.json`，参数同上，校验通过即收录。
改已有风格记得升 `meta.json` 里的 version。
