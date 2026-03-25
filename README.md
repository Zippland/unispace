# UniSpace

每个人都应该拥有一个自己的 AI 助手 —— 不是别人封装好的产品，不是只能在命令行里对话的黑框，而是一个你能看见、能定制、真正属于你的智能体。

UniSpace 让这件事变得简单：选一个你喜欢的模型，四行命令，打开浏览器，开始工作。

![UniSpace](image1.png)

---

## 为什么

现在想用一个 AI agent，你的选择是：

- **买封闭产品** —— 能力被锁死，人格不可定制，数据不在你手里
- **自己折腾 CLI** —— 需要懂终端、配环境、写 prompt，门槛太高

这两条路都把大多数人挡在了门外。

UniSpace 想解决的是：**让任何人都能用上开放模型的全部能力，同时不需要成为工程师。** 一个浏览器里的工作区，连接你选择的 LLM，管理你的对话、文件、技能和人格设定 —— 全部可视化，全部在本地。

---

## 能做什么

**连接任意模型** — 任何 OpenAI 兼容 API：GPT-4o、Claude、Kimi、DeepSeek、本地 Ollama……换一行配置就切换。

**完整文件系统访问** — 读、写、编辑、搜索、执行命令。Agent 直接操作你的文件，不是在沙箱里假装工作。

**技能系统** — 18 个预置技能（文档协作、代码生成、PPT/PDF/Excel……），一个文件夹 + 一个 `SKILL.md` 就能自定义扩展。

**SOUL 人格** — 写一份 `SOUL.md`，定义你的 agent 是谁、怎么说话、遵循什么原则。每次对话自动加载。

**多会话管理** — 对话自动持久化，随时切换，历史完整保留。

**零黑箱** — 开发面板可以实时查看系统提示词、工具定义、思考过程。你永远知道 agent 在做什么。

---

## 快速开始

```bash
git clone https://github.com/Zippland/unispace.git
cd unispace
cd server && bun install && bun link && cd ../web && bun install && cd ..
unispace onboard
```

`onboard` 会创建 `~/.unispace/` 并引导你配置 API Key。

```bash
unispace
```

API 服务启动在 `localhost:3210`，Web 界面在 `localhost:5173`。

---

## 工作区

所有数据在 `~/.unispace/`，你拥有一切：

| 路径 | 用途 |
|------|------|
| `config.json` | 模型、API Key、端口 |
| `SOUL.md` | Agent 人格定义 |
| `sessions/` | 对话历史（JSONL） |
| `skills/` | 技能目录 |

在 Web 界面侧边栏直接点击编辑，不需要碰终端。

---

## CLI

| 命令 | 说明 |
|------|------|
| `unispace` | 启动全部（默认） |
| `unispace start` | 仅 API 服务 |
| `unispace web` | 仅 Web 界面 |
| `unispace onboard` | 交互式配置 |
| `unispace dev` | 启动 + 开发面板 |

---

## 自定义模型

编辑 `~/.unispace/config.json`：

```json
{
  "model": {
    "provider": "openai",
    "name": "gpt-4o",
    "apiKey": "sk-...",
    "baseUrl": "https://api.openai.com/v1",
    "temperature": 0.7
  }
}
```

或 `unispace onboard` 重新配置。

---

## 方向

UniSpace 当前是一个本地单用户工具。但我们想做的不止于此。

下一步的方向是**多渠道接入**：同一个 agent，同一份记忆和技能，能同时连接到微信、Slack、Discord、Telegram —— 在任何你已经在用的地方和它对话，而不是必须打开一个专门的界面。

这件事的本质是：agent 不应该被困在一个入口里。它应该像你的同事一样，出现在你工作的每一个场景中。

这部分还在建设中。

---

## License

MIT
