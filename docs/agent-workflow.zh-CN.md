# 在 Agent 对话中管理项目风格

> 前提：已运行 `npx taste-bank setup`（CLI 全局可用 + skill 已注入 agent）。

本文档讲清楚四件事：给项目**选定**一套风格、**切换**风格、**投稿**当前项目的风格、以及**团队协作**时风格怎么共享。

---

## 场景一：给新项目选一套风格

你刚开了个项目，想让 agent 按某个风格写前端。两种姿势：

### 姿势 A：在 agent 对话里直接说（推荐）

```
你：我想给这个项目找个干净现代的风格，有什么推荐？
```

agent 已经装了 `taste-bank` skill，它会：

1. 跑 `taste-bank list` 浏览风格，挑 2-3 个匹配你描述的给你看
2. 你选定后，它跑 `taste-bank skill <slug>` 拿到**完整包**（规则 + tokens + CSS + 模板）
3. 把包内容读进上下文，严格按里面的 tokens 实现代码

**全程你不用碰终端**——agent 自己调 CLI。

### 姿势 B：终端挑好，再让 agent 实现

```bash
taste-bank list --q dashboard      # 浏览
taste-bank show ai-slop-dashboard  # 看详情（含真实颜色色样）
```

挑好后，在 agent 对话里直接说：

```
你：用 taste-bank 里的 ai-slop-dashboard 风格做这个页面
```

agent 会调 `taste-bank skill ai-slop-dashboard` 拿完整包，然后实现。

---

## 场景二：把风格"钉"在项目里（持久化）

上面两种姿势有个问题：**换一次 agent 会话，风格就忘了**——因为包只是临时进了上下文。如果你希望这个项目**长期绑定**一套风格，用 `use` 命令把它写进项目文件：

```bash
taste-bank use ai-slop-dashboard
```

这会在项目里创建 `.agents/skills/ai-slop-dashboard/SKILL.md`（默认）。之后**每次 agent 启动**都会自动读到这个文件，知道"这个项目用 ai-slop-dashboard 风格"。

### 三种落地位置（按你的 agent 选）

```bash
taste-bank use <slug>                  # 默认：./.agents/skills/<slug>/SKILL.md（通用 skill 目录）
taste-bank use <slug> --as agents      # 追加到 ./AGENTS.md（Codex 读这个）
taste-bank use <slug> --as claude      # 写 ./.claude/commands/<slug>.md（Claude Code）
```

### 托管块机制（不会覆盖你的手写内容）

`use` 写入的内容用 sentinel 标记包裹：

```markdown
<!-- BEGIN taste-bank:ai-slop-dashboard (v1.3.0) — 勿手改，运行 taste-bank use ai-slop-dashboard 更新 -->
...风格规则 + tokens...
<!-- END taste-bank:ai-slop-dashboard -->
```

- **重跑 `use`**：只更新标记块内的内容，块外你手写的项目规则原样保留
- **手动编辑了块内**：下次 `use` 会覆盖回去（所以别改块内，改风格就换一套）
- **项目级记录**：`use` 同时写 `.style-lab/used.json`，记录"这个项目用了哪些风格、什么版本"——`taste-bank doctor` 能看到

---

## 场景三：切换风格

项目一开始用了 A 风格，现在想换成 B。两步：

```bash
# 1. 落地新风格（会在项目里新增一个 sentinel 块/文件）
taste-bank use <new-slug>

# 2. （可选）清掉旧风格的痕迹
# 如果旧的是 --as agents 模式，手动删 AGENTS.md 里旧的 BEGIN/END 块
# 如果是独立文件模式（skill/claude），直接删那个文件
```

**一个项目可以同时绑多个风格**——`used.json` 是数组，能记多个。但实践上建议一个项目只绑一套，避免 agent 困惑。

---

## 场景四：投稿当前项目的风格

你有个项目的前端风格很棒，想沉淀成 pack 投到 taste-bank。**最省事的方式**是让 agent 走完整 SOP：

```
你：把这个项目的风格投稿到 taste-bank
```

agent 装了 `taste-bank-contribute` skill，它会按 SOP 执行：

1. **采样**（最多读 2 个文件：1 个主样式 + 1 个代表性页面）
2. **提取真实 tokens**（颜色/字体/间距，只取项目里真实出现的值）
3. **脱敏**（业务术语、产品名、域名全换成中性词——"旁观者猜不出原业务"为准）
4. **打包**（meta + tokens + skill + templates，按 zod schema）
5. **校验**（`taste-bank validate`）
6. **投稿**（`taste-bank submit`，签名 + 发送，进审核队列）

全程你只需确认几个事：作者名、邀请码（首次）、模板脱敏是否满意。

### 手动投稿（想自己控制每一步）

```bash
# 1. 一次性身份配置
taste-bank keygen
echo '{ "inviteCode": "sl_xxx" }' > ~/.style-lab/config.json

# 2. 手写 pack.json（格式见 docs/SPEC.md 或 taste-bank-contribute skill）
# 3. 校验
taste-bank validate my-style.pack.json

# 4. 投稿
taste-bank submit my-style.pack.json
```

> 投稿后进入审核队列，库主 approve 后才上架。`taste-bank whoami` 可查状态。

---

## 场景五：团队协作——共享风格绑定

如果团队都用 taste-bank，最简单的协作方式是把 `use` 写的文件**提交进 git**：

```bash
taste-bank use ai-slop-dashboard --as agents   # 写进 AGENTS.md
git add AGENTS.md .style-lab/used.json
git commit -m "chore: 绑定 ai-slop-dashboard 风格"
```

这样队友 clone 仓库后，他们的 agent 启动时**自动读到** AGENTS.md 里的风格规则——不用每个人手动 `use`。

> `.style-lab/used.json` 也建议提交——它记录了项目绑定的风格 + 版本，`taste-bank doctor` 能检测"线上版本更新了，该重新 `use` 了"。

---

## 常见问题

### Q：agent 会自己调 taste-bank，还是我得告诉它？

**它会自己调**——前提是跑过 `setup`（skill 已注入）。agent 识别到"设计/风格"相关意图时，会主动跑 `taste-bank list` / `skill`。但第一次你可以显式说"用 taste-bank 里的 xxx 风格"，帮它建立关联。

### Q：风格更新了（线上版本升了），我项目里的是不是过期了？

可能。`taste-bank doctor` 会检测本地缓存的新鲜度（3 天 TTL）。要更新项目里钉死的版本，重跑：

```bash
taste-bank use <slug>    # 会拉最新版本，覆盖 sentinel 块内内容
```

### Q：离线时还能用吗？

- `taste-bank skill <slug>`：3 天内拉过的会走缓存；超 3 天或没拉过则需要网络
- `taste-bank use`：需要网络（要拉最新包）
- 已经 `use` 写进项目的文件：**永远离线可用**（内容已经在文件里了）

### Q：一个项目能同时用多套风格吗？

技术上可以（`used.json` 支持多个），但**不建议**——agent 会困惑该遵循哪套 tokens。一个项目一套风格，想混搭就投稿一套新的混搭风格。

### Q：怎么知道 agent 真的按风格实现了？

让它实现完跑一下 `taste-bank show <slug>` 对照 tokens——颜色/字体/间距是否都取自包内定义。或者在对话里直接问："你用的颜色变量是不是都来自这套 tokens？"

---

## 速查：日常对话里怎么说

| 你想要的 | 对 agent 说 |
|---|---|
| 选个风格 | "帮我从 taste-bank 找几个适合 dashboard 的风格" |
| 用某套 | "用 taste-bank 的 ai-slop-dashboard 风格做这个页面" |
| 钉到项目 | （终端）`taste-bank use <slug>` |
| 换风格 | （终端）`taste-bank use <新slug>` + 删旧块 |
| 投稿这个项目 | "把这个项目的风格投稿到 taste-bank" |
| 查我投过什么 | （终端）`taste-bank whoami` |
| 体检 | （终端）`taste-bank doctor` |
