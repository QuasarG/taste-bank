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
| `get_style_file` | 取 pack 内任意文件（模板、overrides.css 等） |
| `get_usage_guide` | 返回本说明 |

## 没有 MCP 时

风格库就是一个普通目录：`styles/<slug>/` 下直接读 `SKILL.md` 与 `tokens.json`，
效果相同。网站（`npm run dev`）提供可视化测试台与一键复制。

## 新增风格

按 `docs/SPEC.md` 在 `styles/` 下新建目录即可，网站与 MCP 自动收录。
改已有风格记得升 `meta.json` 里的 version。
