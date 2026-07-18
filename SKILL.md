---
name: style-lab
description: 个人前端风格库。通过 MCP 工具（或本地文件）获取风格 pack——含 SKILL.md、tokens、模板文件——让任意 coding agent 复现统一的前端风格。当用户要求使用其个人风格库中的风格实现前端时使用；也包含把任意项目提炼成风格 pack 并投稿的 agent 工作流。
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
| `submit_style` | 投稿新风格（meta + tokens + skill + 可选 overrides/templates/ownerPubkey），校验通过即收录 |
| `update_style` | 更新自己登记过的风格（version 必须递增，需私钥签名） |
| `delete_style` | 删除自己登记过的风格（需私钥签名） |
| `generate_keypair` | 生成 ed25519 管理钥匙对（私钥经 MCP 传输，注意保管） |

## 管理自己的风格（agent 工作流）

1. 生成钥匙对，三选一：
   - 调 `generate_keypair` 工具（最省事；注意私钥会经过 MCP 连接传输，立即交用户本地保管）
   - 在 style-lab 仓库里跑 `npm run keygen`（需要本地有 Node 与仓库）
   - 任意 ed25519 工具（如 OpenSSL），只要产出 base64 DER 格式（私钥 pkcs8 / 公钥 spki）
   私钥交用户本地保管，**不要写进投稿内容**；公钥可公开
2. 投稿时在 `ownerPubkey` 字段带上公钥，完成所有权登记
3. 更新/删除时签名：消息 = `style-lab:<update|delete>:<slug>:<timestamp>:<sha256(payload)>`，
   `node scripts/sign.mjs <私钥> <action> <slug> [payload文件]` 一步生成（或自行实现，算法为标准 ed25519）
4. 调 `update_style` / `delete_style`（或 HTTP PUT/DELETE）。未登记 owner 的风格不可管理

## HTTP API（与 MCP 等价）

`GET /api/styles.json`、`GET /api/styles/:slug.json`、`GET /api/styles/:slug/skill.md`、
`GET /api/styles/:slug/tokens.css`、`POST /api/styles.json`（投稿，body 同 submit_style 参数）。
不支持 MCP 的 agent 直接 curl 即可。

## 提炼并投稿（agent 工作流）

当用户在自己的项目中要求「把本项目的风格入库」时，严格按以下步骤执行：

1. **采样**：通读项目的主样式文件与 1~2 个代表性页面/组件，提取实际使用的
   颜色、字体、字号层级、间距、圆角、阴影、动效。**只允许用项目里真实出现的值，
   禁止凭空发明**——每个 token 都要能指回出处。
2. **归纳角色**：颜色映射到 `bg / surface / text / muted / line / accent` 六个角色，
   功能色（warn/success 等）作扩展键；字体映射到 display/body/mono。
3. **找 signature**：这套界面最独特的视觉特征是什么（一种边框处理、一种排版习惯、
   一个交互动效）？写进 `meta.signature`；变量表达不了的部分用 `overrides.css` 实现，
   并 scoped 在 `[data-style="<slug>"]` 下。
4. **写规则**：`do / dont` 从项目实际模式推导——`dont` 尤其重要
   （例：全站无圆角 → 「禁止圆角」）。`voice` 总结按钮与报错的措辞习惯。
5. **做模板快照**：取一个代表性页面，**尽量原样保留它的布局结构、组件丰富度
   与视觉细节**——快照的价值就在于「长得就像原页面」，让看到的人立刻认出这套风格。
   整理为自包含 HTML（内联 CSS、无 script、无外部依赖）作为 `templates/page.html`。
   **不要重写成简化版演示页**，那等于把风格的神韵也一起删了。
6. **脱敏自查**：脱敏 = **换词不换骨**，但「词」有三层，一层都不能漏：
   - **可见文案**：产品名、公司名、人名、业务术语、域名/IP、路径中的用户名，
     全部换成中性等价词
   - **代码命名**：class / id / 变量名里的业务痕迹（如 `candidate`、`talent`、
     `evaluate`）同样要换成 `item`、`entry`、`review` 这类中性词
   - **领域暗示**：组件的组合方式不能暴露业务——「评分带 + 候选人列表」一眼
     人才评估，要改成「数值带 + 条目列表」这种认不出原业务的组合
   布局、间距、配色、字体、组件类型保持原样。完成后做**旁观者测试**：
   只看快照问自己「能猜出这是什么业务吗」——能，就继续中性化，直到猜不出为止。
   密钥、token、cookie 不得出现；服务端会对高置信度密钥模式直接拒收，
   但语义层面的隐私只有你把得住，漏了就是事故。
7. **投稿**：调用 `submit_style`（或 `POST /api/styles.json`）。
   校验失败时按错误信息修正重试，**不要绕过校验**。

SKILL.md 正文章节要求见 `docs/SPEC.md`（概述/使用场景/设计要点/Do & Don't/文案语气/文件清单）。
**正文里禁止手写 Tokens 附录或变量值清单**——库会在投递时从 tokens.json 自动生成，
手写一份只会变成漂移源。

## 没有 MCP 时

风格库就是一个普通目录：`styles/<slug>/` 下直接读 `SKILL.md` 与 `tokens.json`，
效果相同。网站（`npm run dev`）提供可视化测试台与一键复制。

## 新增风格

手写：按 `docs/SPEC.md` 在 `styles/` 下新建目录即可，网站与 MCP 自动收录。
投稿：调 `submit_style` 工具或 `POST /api/styles.json`，参数同上，校验通过即收录。
改已有风格记得升 `meta.json` 里的 version。
