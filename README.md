# Style Lab

anonymous 的个人前端风格库。每套风格是一个结构化 pack（SKILL.md + tokens + 模板文件），
网站负责展示与复制，MCP server 负责把风格直接递到 coding agent 手里。

## 快速开始

```bash
npm install
npm run dev      # 打开 http://localhost:4321 看风格库
npm test         # 全部测试（schema / store / assemble / MCP 冒烟）
npm run build    # 构建静态站到 dist/
npm run mcp      # 以 stdio 方式启动 MCP server
```

## 目录

```
styles/<slug>/   # 风格 pack（规范见 docs/SPEC.md）
src/lib/         # 核心逻辑：schema 校验 / store 读取 / SKILL.md 与 CSS 组装
src/pages/       # 画廊 + 风格详情页（组件测试台）
src/components/  # 固定组件骨架（所有风格共用，换肤即对比）
mcp/server.ts    # MCP stdio server，工具见下
tests/           # node:test 测试
```

## MCP 接入

在 agent 客户端的 MCP 配置中加入：

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

工具：`list_styles` / `get_style` / `get_style_skill` / `get_style_css` /
`get_style_file` / `get_usage_guide`。用法说明本身也是一份 skill（根目录 `SKILL.md`），
agent 可随时通过 `get_usage_guide` 获取。

## 新增风格

按 `docs/SPEC.md` 在 `styles/` 下新建目录（meta.json + tokens.json + SKILL.md +
templates/ 至少一个 HTML），网站与 MCP 自动收录。改已有风格记得升 version。
