# Mira · Catwork · Feature 清单

> **⚠️ 开发事实源已迁移到 [spec.md](./spec.md)**。本文档为完整产品愿景和历史讨论记录，spec.md 和本文档有冲突时以 spec.md 为准。

> **背景**：Mira 目前只有基建层（沙箱 / 存储 / SSO / 对话 runtime）和 chatbot 形态（单轮/多轮对话，无工作空间概念）。本文档描述要新增的 **"Catwork" 形态** —— 让 Mira 从"几个对话框"进化成"一个可装配的 agent factory"。
>
> 可参考 demo：<https://github.com/Zippland/unispace/tree/mira-demo>

---

## 一、产品形态演进

```
Mira 现状 (chatbot)                       本文档新增的三层
─────────────────────                    ──────────────────────

[ 基建 ]                                  [ 一 · Catwork ]
  ├─ 沙箱                                  用户的工作文件夹（folder 形态）
  ├─ 对话 runtime                                │
  ├─ 存储 (tors)                                 │  装控制面
  ├─ SSO / 身份                                  ▼
  └─ manager agents (既有)                 [ 二 · 用户控制面 ]
                                             把 Catwork 装成 agent
[ chatbot ]                                       │
  一个对话框，无上下文归属                            │  进管理面
                                                  ▼
                                           [ 三 · 后台管理面 ]
                                             BU 对 agent 的治理
```

**核心**：在 Mira 当前能力之上，把 **"Catwork → 装配能力 → Agent → 管理治理"** 这条产品主线从零建起来。

**约束**：
- **数据结构对齐** —— Catwork 的字段要预留给 agent，避免第二步返工。
- **Mira 的 manager agents** —— 管理面要跟它对齐 / 合并，不另起炉灶。

---

## 二、分工建议

| 组 | 负责范围 | 核心抽象 |
|---|---|---|
| **A 组 · folder → Catwork 容器** | 一、folder 过渡态 + Catwork 容器层 | 用户第一眼看到的"文件夹"，可以塞东西、对话；后续和 B 组合体成 Catwork |
| **B 组 · 控制面** | 二、用户控制面（Catwork 的装配层） | 让 folder 长出 skills / tasks / datasources / connectors 等能力，合体成 Catwork |
| **C 组 · 管理面** | 三、后台管理面 | admin 视角，跟 Mira manager agents 打通 |
| **横向** | 六、跨组 / 平台级 | CLI / Agent Factory / 发布节奏 |

**关键心智**：**Catwork = folder + 控制面**。A 组做 folder 是一期过渡态（先让用户感受到"可以塞东西的工作空间"），B 组的控制面补齐后，folder 就演进为完整的 Catwork —— **A + B 的产出合起来才是 Catwork 这个产品**。C 组独立承接发布出来的 Catwork 的治理视图。

**并行开发前提**：三组在启动前一起对齐字段，把数据模型做好（见第八节）。

---

## 三、A 组 · folder 过渡态 + Catwork 容器层

> **Catwork = folder + 控制面**，是 Mira 新增的核心产品形态。**folder** 是 Catwork 的一期过渡态 —— 只有容器、还没有装配层的纯文件夹。A 组负责 folder 的全部实现 + 作为 Catwork 容器层的长期演进基础；等 B 组把控制面补齐，folder 就演进为完整的 Catwork。
>
> 下面的 W1-W6 描述的都是**容器层**的功能（session、files、沙箱、三栏外壳等），不包含控制面的装配能力。但字段必须为 Catwork 的装配层预留好。

### W1. Catwork 生命周期
**本质**：一个 Catwork = 一个独立的工作上下文 + 一个预留的 agent 人格容器。
**范围**：
- 创建 Catwork（两种入口）：
  - **从零新建** —— `bu = null`（用户个人私有，不属于任何 BU）
  - **从 BU template clone** —— `bu = 源 template 的 bu`，`cloned_from` 记录来源版本
- 切换 / 重命名 / 删除
- 列表 / 搜索
- Catwork 元数据（创建人、归属 BU / null、来源 template、创建时间、最后活跃时间）
- **物理形态**：每个 Catwork 对应一个独立的 home 目录 `/home/mira-<id>/...`，按 Claude Code 官方目录布局组织；home 目录被持久化，跨会话不丢
- **数据结构预留**：`model` / `system` (CLAUDE.md) / `skills[]` / `datasources[]` (view) / `connectors[]` (mcp_server) / `tasks[]` / `dispatch[]` / `api` / `environment_id` …… —— 第一期全部可以为空
- **从 template 升级**（只对从 template clone 的 Catwork 可用）：
  - 检测 `cloned_from.template_version < latest_version` 时显示升级提示
  - 用户手动点击 → 拉取新版 template 的 `agent_snapshot` 覆盖当前 Agent 字段
  - 一期策略：**整体覆盖**，用户本地对 Agent 字段的修改会丢（files / sessions 不动）
  - 升级后更新 `cloned_from.template_version` 到最新

### W2. Session 与 Catwork 绑定
**本质**：Mira 既有的 session 是无归属的，新形态下每个 session 绑定到一个 Catwork，且**不可跨 Catwork 迁移**。
**范围**：
- Session 字段里加 Catwork 标识（`catwork_id`，创建时绑定，不可变更）
- 新建 / 删除 / 重命名 session
- Session 持久化（每 Catwork 独立）
- Session 列表按 Catwork 范围折叠成 folder
- **同一 Catwork 下所有 session 共享 workspace / files** —— session 是无状态的纯对话，不持有独立文件；`ls` 看到的是 Catwork 级的 workspace 目录，跨 session 可见
- **默认 Mira Catwork**：用户首次进入 Mira 时，系统自动为其创建一个默认 Catwork（= 当前 Mira 外壳的大对话区域）。用户在"外面"的所有对话本质上都发生在这个默认 Catwork 里。用户不感知 Catwork 概念 —— 界面呈现和现在一样，只是底层有了 Catwork 归属
- **Session 不可跨 Catwork 迁移**（已确认砍掉）：
  - **原因**：session 与所属 Catwork 的 system prompt / skills / tools **强绑定**，上下文不连续 —— 迁到新 project 后原有工具和 SP 失效，session 质量严重有损
  - **替代方案 · session 挂载为 datasource**（以终为始的设计）：用户想把一个 session 的成果"带到"新 Catwork 时，把 `session.jsonl` **挂载为目标 Catwork 的一个 datasource**，使目标 Catwork 内的 agent 可以 refer 到这段对话内容。过渡态 UX = "拖 session 到 folder"，底层 = datasource 挂载。这条路径复用 C2 Datasource 的异构聚合能力，不需要发明新机制

### W3. 文件收集（Local 和 Source）
**本质**：Catwork 作为"把用户关心的所有东西都塞进来"的篮子。
**范围**：
- 本地文件拖拽上传
- 外部链接粘贴（飞书 doc/sheet/wiki、三方、普通 URL）自动转换为 `.url` 文件
- 文件树浏览、搜索、预览、重命名、排序、删除
- 上传目的地：Catwork 的沙箱目录

**机制**：`.url` 文件的语义落地 —— agent 读取 `.url` 时自动按类型路由到对应 loader：
- **飞书 doc / sheet / wiki** → 调对应的 **飞书 skill** 打开（skill 里封装了飞书 API 认证和正文提取逻辑）。agent 看到 `.url` 的 metadata 里有飞书域名时自己判断该用哪个 skill。
- **普通 URL** → 走 fetch + 正文提取
- **自定义类型** → 装载对应 MCP 工具

这个机制的前提是 `.url` 文件里有足够的 metadata 告诉 agent "我是谁"（url + type + 可选的标题），agent 自己决定用哪条 loader 路径。

### W4. 对话拖拽上下文
**本质**：用户把 Catwork 里任何东西拖进 chat，作为这一轮的显性上下文。
**范围**：
- 拖 files / skill / datasource / task 进 chat
- `@` 触发引用 shadow context（从文件树 + 资源列表过滤）
- `/` 触发 **manual task** 的 shadow context（原 slash command 语法，`/name args` 展开）
- 发送前把 attachments 展开成**结构化 prompt 头**（不是纯文本 marker），让 agent 知道这是用户显性指定的上下文 + 知道以什么 tool 去操作这些资源

### W5. Catwork 四栏外壳（待分工）
**本质**：承载 Catwork 的主界面 —— 左一折叠 mira 侧边栏、左二 sidebar、中 chat、右 preview。
**范围**：
- 四栏可调宽度布局
- Sidebar：Catwork 切换 + 文件树 + sessions
- 中间：Chat panel
- 右边：文件预览（md / 图像 / PDF / CSV 简单表 / 代码）等 Artifacts
- 右边：Tab bar，管理多个打开的 Artifacts

### W6. 沙箱接入
**本质**：每个 Catwork 有独立文件系统 + 独立执行环境。
**范围**：
- 每个 Catwork 一个独立沙箱实例
- 文件系统隔离

---

## 四、B 组 · 用户控制面

> 控制面是给用户使用的 Catwork → agent 的装配层。提供 agent 能被装配的 N 个维度。每个 sub 需要解释：**为什么存在 / 用户怎么编辑 / agent 怎么执行**。
>
> **用户心智**："我先拖了文件（Catwork），然后发现可以加工具（skill），可以让它定时跑（task），可以让它对外发消息（connector）" —— 渐进式发现，控制面一上线就从 folder 演变成 agent runtime。

### C0. 控制面外壳
**本质**：承载所有 sub tab 的容器 + 管理用户的 sub 偏好。
**范围**：
- Sub-nav 列表（所有 sub tab）
- Sub 间切换、URL 同步
- Promoted tabs：用户可把常用 sub pin 到 sidebar 顶部
- 每个 sub 的"+ 新建"入口和管理方式

### C1. Files（Local 文件）
**本质**：agent 的沙箱内读写状态 = 内部工作记忆。跟 W3 是同一份数据的控制面视角展开 view。
**存储路径**：`/home/mira-<catwork>/workspace/` （Claude Code 官方目录布局里的 `workspace/` 子目录，不是 `.claude/` 下）
**范围**：
- 文件树 CRUD + 上传 + 预览 + markdown 编辑
- 多类型预览（md / 图像 / PDF / CSV / 代码）
- 搜索 + Grep
- Agent 视角：Read / Write / Edit / Glob / Grep 原生工具 + `--add-dir` 挂载
- 拖拽进 chat → 结构化 prompt 注入（agent 知道用户引用了哪些 files）

### C2. Datasource（外部数据源 · 表面同构 / 底层异构）
**本质**：用户视角的"外部数据源"统一入口 —— **表面上是同构的 datasource 列表**，**底层按来源异构**。
Datasource 不是一个独立的物理存储，而是一个**聚合视图**：产品层把三种不同来源的资源统一呈现为"数据源"卡片，用户不用关心底层形态。
**四种底层来源**：
- **cli 类** → 存在 `/home/mira-<catwork>/bin/` 下，配置在 `.config/<cli>/config.yaml`（例：风神 `bin/aeolus-cli` + `.config/aeolus-cli/...`）
- **mcp 类** → 存在 `.claude.json` 的某个 mcp_server 条目里（跟 C3 Connectors 共用存储，但归属语义不同）
- **skill 类** → 存在 `.claude/skills/<name>/SKILL.md` 里（跟 C5 Skills 共用存储）
- **session 类** → 来自其他 Catwork 的 `session.jsonl` 挂载（用户"拖 session 到 folder"的底层实现）。agent 可以 refer 这段对话的上下文，但不继承原 session 的工具调用能力

**范围**：
- UI 层：统一的 datasource 列表，按 type 分组（Aeolus / Hive / Sentry / 飞书表格 / 群聊 / 自定义），显示为同构卡片
- 读取：从 `bin/`、`.claude.json`、`.claude/skills/`、挂载的 `session.jsonl` 四处聚合投影
- 编辑：根据卡片来源路由到对应的底层编辑入口（cli → 改 yaml 配置；mcp → 改 `.claude.json`；skill → 改 SKILL.md；session → 只读，来源为其他 Catwork 的对话记录）
- 拖拽进 chat → 结构化 prompt 注入（agent 知道用户引用了哪个 datasource id 和它的底层形态）

**设计原则**：**产品概念和物理存储解耦** —— datasource 是用户心智里的统一入口，代码实现时它只是一个投影层，不持有独立数据。

### C3. Connectors（外部动作通道 · mcp_server）
**本质**：agent 的外部动作句柄 = **MCP server**（一方 mcp + 用户 mcp）。
**存储路径**：`/home/mira-<catwork>/.claude.json`（Claude Code 官方的 MCP 配置文件）
**范围**：
- Connector catalog：按 type 分组（Slack / Gmail / GitHub / Notion / 飞书通知 / 自定义 MCP）
- Install 流程：选 type → auth + config → 写入 `.claude.json` 的 `mcpServers` 字段
- Uninstall / 编辑 `.claude.json` 对应条目
- Secret 字段 redaction：敏感字段（token / secret）不进 agent 视野
- Mira API 对齐：直接映射到 Mira `Agent.mcp_server` 字段

### C4. Tasks（统一触发抽象 · UI 层 prompt+trigger / 底层 sh 脚本）
**本质**：Catwork 里**所有触发 agent 的路径统一到 Task 抽象**。
**UI 层**：仍呈现为 `prompt + trigger + 预设上下文`，用户看到的是"这个任务要做什么 + 什么时候做"。原来独立的 Commands 不再单独存在 —— **command 就是 manual trigger 的 task**，`/name args` 是它的交互入口。
**底层存储**：`/home/mira-<catwork>/tasks/<name>.sh` —— 每个 task 序列化成一个 shell 脚本文件。脚本结构：
```sh
#!/bin/sh
# name: weekly_revenue_report
# description: Generate weekly revenue summary
# trigger: fixed
# schedule: 0 9 * * MON
mira_cli session send --agent "$AGENT_ID" --message "$(cat <<'PROMPT'
本周业务周报 ... (这里是用户填的 prompt body)
PROMPT
)"
```
UI 读取时解析顶部注释元数据 + 提取 heredoc 块作为 body，呈现成表单。UI 保存时反向生成 sh 脚本。

**四种 trigger type**（UI 呈现）：
- **`manual`** —— 用户主动触发：chat 里 `/name args` 或点 "Run now"
- **`heartbeat`** —— 规律唤醒 + 条件触发
- **`fixed`** —— 用户自己设的 cron
- **`model-schedule`** —— 模型自己决定下次什么时候唤醒

**范围**：
- Task CRUD（UI 操作表单，底层读写 sh）
- Task 附件：预设 datasources / files 作为运行时默认上下文
- Slash 展开：`/name args` → 服务端把 task body + args 注入为 user message
- Fixed cron 的真实调度器：server 起 in-process scheduler 执行 sh 脚本
- Model-schedule 机制：agent 输出末尾带 `<<next_run:ISO>>` sentinel
- Heartbeat 机制：runtime 按周期 tick 执行 sh
- Template 引导：BU template 可以预置若干 manual task

### C5. Skills（能力 / 方法论）
**本质**：可复用的"如何做 X"操作手册 = 给 agent 看的 runbook / 含代码。
**存储路径**：`/home/mira-<catwork>/.claude/skills/<name>/SKILL.md`（对齐 Claude Code 官方）
**依赖**：Mira 对话 runtime 的 skill 加载机制。

### C6. Dispatch（入站通道）
**本质**：让 agent 可以通过飞书 bot 聊天。
**存储路径**：`/home/mira-<catwork>/dispatch/<bot-id>.json`（一个 bot 一个 json 文件）
**范围**：
- Dispatch type：飞书 bot（Slack bot / Email inbound 是否要做？）
- 配置：app_id / app_secret / encrypt_key / 默认频道等
- 运行时：每个 dispatch 启动一个 worker，收到消息 → 创建或追加到对应 session
- Session channel 绑定：一个 dispatch 来的消息能找到它过去的 session
- 消息去重 / 重放保护
- 跟 M2 的 "agent ↔ dispatch 绑定"相关（管理员指定某个 agent 接哪条 dispatch）

### C7. Persona（CLAUDE.md 人格）
**本质**：agent 的 system prompt = "我是谁，我的原则，我的上下文"。
**存储路径**：`/home/mira-<catwork>/.claude/CLAUDE.md`
**Mira API 对齐**：映射到 `Agent.system` 字段。
**范围**：
- markdown 编辑器编辑 CLAUDE.md
- 作为 system prompt 前置到每次对话
- 保存后下次对话立即生效

### C8. Model / Runtime Settings
**本质**：选模型 / 运行参数。
**范围**：
- Model picker（Opus / Sonnet / Haiku / custom）
- 每 Catwork 独立的 settings
- Env vars 配置

---

## 五、C 组 · 后台管理面

> 管理面的主体是 **"BU 管理员对 agent 的治理"** —— 谁能发布、谁在用、质量如何、费用如何、出了问题怎么追溯。
>
> **对齐**：Mira 的 Catwork 形态当前还没有对应的管理面。C 组的工作是把 Mira 既有的 manager agents 和 Catwork 的 agent 概念打通 / 合并。

### M0. BU 上下文 / 身份
**本质**：把用户的真实身份 + 所属 BU 映射到整个管理视图。
**范围**：
- SSO 登录（复用 Mira 现有）
- 用户身份 / BU 列表
- BU 切换触发整个 admin 视图按该 BU 过滤
- **一期先做 Mira Dashboard，然后做 BU 配置页**

**BU admin 的三件事**（仅此三件）：
1. **提供模板** —— 在本 BU 的 Gallery 发布 / 更新 template（用户 clone 后使用）
2. **Trace & Debug** —— 观察本 BU 下的用户怎么用本 BU 的 template（看 session / trace / 错误），用来反哺下一版 template
3. **发出新版本** —— 发现 template 有改进空间时发布新 version，通知用户手动升级

**BU admin 明确不能做的事**：
- ❌ 不能编辑用户 clone 后的私有 Catwork（即使 Catwork.bu 指向本 BU，也不能）
- ❌ 不能直接修改一个已发布的 template（只能发新版本）
- ❌ 不能跨 BU 看其他 BU 的用户 Catwork

**Trace 权限规则**：
| 角色 | 能 trace 的范围 |
|---|---|
| 普通用户 | 自己的所有 Catwork（包括 bu=null 的个人 Catwork 和从 template clone 的） |
| BU admin | 所有 `Catwork.bu == 本 BU` 的 Catwork（= 用了本 BU template 的用户） |
| **Mira 超级 BU admin** | **所有用户的所有 Catwork**（包括 bu=null 的个人 Catwork） |

**Mira 超级 BU**：是一个特殊的全局 BU（`bu_key = "mira"`），其 admin 拥有全量观测权（跨所有 BU + 所有个人 Catwork）。一期的核心管理员都放在这个 BU 里，用来调试整个系统。

### M1. Dashboard
**本质**：BU 视角的平台健康概览。
**范围**：
- 指标卡：deployed agents 数 / API 调用（7d）/ Active users / Error rate / Cost (MTD)
- Top agents 表（本 BU 的 agent 按调用量排）
- Agent quality 表（satisfaction / avg turns / error rate）
- Recent activity 流（agent 状态变更操作等）
- Budget 卡（Token 预算 / 已用 / 剩余 / 执行率）
- **指标来源**：从 traces 聚合

### M2. Agents 管理（列表 + 详情）
**本质**：对每个 agent 的全生命周期配置。
**范围（列表）**：按 BU 过滤 / 新建 / 删除 / 搜索 / 按是否有 `cloned_from` 过滤（区分自建 vs 从 template clone）。
**谁进入这个页面**：
- 普通用户进自己的某个 Catwork 详情时（看自己做的 agent）
- BU admin 进本 BU template 下某个用户的 Catwork 时（只读 + trace，不能编辑）
- Mira 超级 admin 可以进任何 Catwork

**范围（详情的 6 个 tab，每个都对应控制面的一个维度）**：
- **Persona**：name / description / icon / author / BU / model / system_prompt / 状态 — owner 可编辑，其他 role 只读
- **Capabilities**：skills 的嵌入式 CRUD（**一期只做 skills**；subagents 因 callable_agents 暂不支持，一期不做）— owner 可编辑，其他 role 只读
- **Tasks**：task 模板配置 —— 包含 manual（引导用）+ heartbeat / fixed / model-schedule（调度用）四种类型；template 里预置的 manual task 会跟着 clone 带到用户 Catwork — owner 可编辑，其他 role 只读
- **Publish**：
  - 在 **BU admin 自己的 Catwork** 上：把当前 Catwork 作为 template 新版本发布到本 BU Gallery（是 BU admin 的核心工作流之一）
  - 在 **普通用户的 Catwork** 上：不可见 / 禁用（普通用户不能发布 template）
  - 在 **API 层面**：生成 / 撤销 API key、限流配置、usage 统计 — owner 可用
- **Playground**：在 admin 页面直接跟 agent 对话测试 — 任何有 view 权限的 role 都能玩
- **Users**：`agent 作为服务被消费时` 的消费者白名单：
  - 谁能通过 **API key** 调用它
  - 谁能通过绑定的 **Dispatch**（飞书 bot 等）跟它聊
  - 注：Template clone 权限**不在这里管**，走 BU 成员机制（BU 的成员默认可以 clone 本 BU 的 template）

**核心约束**：Agent 详情的字段结构必须跟控制面 1:1 对应 —— owner 本人在控制面或管理面改的是**同一份数据**。BU admin 看到的是**只读视图 + trace 工具**，不是编辑权。

### M3. Traces 追踪
**本质**：全链路调用追踪 = 审计 + 故障排查 + 质量分析的数据基础。
**范围**：
- Trace 列表（分页 / 按 logId 搜索 / 按 agent 过滤 / 按时间）
- Trace 详情：root span + children 树
- Span 详情：input / output / duration / token usage / error
- LLM call 可视化（input messages + output + tool calls）
- 按 agent / session 过滤

### M4. Gallery（模板市场）
**本质**：已发布的 agent template 作为"能力包"供用户 clone 成自己的私有 Catwork。
**范围**：
- 按 BU / 职能分类的 template 列表（默认只显示每个 family 的 `is_latest` 版本）
- Template 预览（persona + 能力 + 示例会话 + 预置 task + 当前 version + changelog）
- **版本历史**：点开一个 template 可以看到同 family 下所有历史版本和 changelog
- **Clone 到用户 Catwork**：
  - 新 Catwork 的 `author = 当前用户`，`bu = template.bu`
  - 新 Catwork 的 `cloned_from = { family_id, version }`（指向 clone 时的 template 版本）
  - 模板里的 **manual task 作为引导项**一起带过去，用户一打开就能 `/xxx` 触发
- **Clone 权限**：默认本 BU 成员可 clone 本 BU 的 template；跨 BU clone 默认不可，由 BU admin 决定是否开放
- **BU admin 发布入口**（M2 Publish tab 调用）：
  - 发第一版：创建新 family + v1
  - 发新版本：选已有 family + `INSERT` v(n+1) + 填 changelog + 翻转 `is_latest`
  - 下架：把某个 family 标记为 deprecated（老 clone 仍然能运行，新 clone 禁止）
- **用户端升级提示**：用户某 Catwork 的 `cloned_from.template_version < latest_version` 时，控制面顶部显示 "有新版本 v(n+1) 可升级" + changelog + 升级按钮（见交互 10）

### M5. BU 级治理（优先做）
**本质**：跨 BU 的全局视图（给顶层 admin 用）。
**范围**：BU 列表、BU 成员管理、BU 预算配置、BU 间权限隔离。

---

## 六、跨组 / 平台级

> 这一层的东西不归属任何一组，而是三组都依赖的共用能力，或是跨组的协作流程。

### X1. CLI 能力
**本质**：命令行接口 —— 启动 / 管理 Catwork / 远程操作 Mira runtime。
**范围**：
- `mira catwork` / `mira agent` 命令家族：创建 / 切换 / clone / 列出
- **CLI 作为 agent tool**：agent 可以通过一个 tool 调用 CLI，进而通过控制面创建新的 Catwork / 装 skill / 调接口
- CLI 创建的 Catwork 带 creator 标识
- 跟 Mira 既有 manager agents 的 SQL API 等打通，作为一套完整的对外可用接口
**归属**：核心团队带合作团队（站队同学 + 劲松那边一起做）
**连接到**：X2 Agent Factory

### X2. 平台 = Agent Factory
**本质**：平台本身就是一个"能造出新 agent 的 agent"。用户跟平台对话 → 平台通过 CLI tool 调用自己的控制面 → 生成新的 Catwork 和 Agent。
**范围**：
- 平台自己有 persona / skills / commands（把 "管 agent 创建" 的能力打包成 skill）
- 用户 ↔ 平台 agent 对话 → 调 CLI tool 创建新 Catwork
- 新 Catwork 带 creator 标识，用户可继续编辑
- **最终目标**：后续所有方提供的 agent 都从这个平台生成 —— 平台是 agent 的唯一来源，而不是各团队各自写 agent 代码
**依赖**：X1 CLI 先做通

### X3. 对外可讲的 API 封装
**本质**：Mira Catwork 作为平台对外展示时，需要把 CLI / manager agents / SQL API 封装成一套可对外讲解的接口。
**范围**：
- CLI 对外可调用的 API
- UI 讲解（对外演示时的 API 文档 / 示例）
- 最终由其他方推进 —— 核心团队不是 owner，只保证能做通
**优先级**：低优先（会议原话 "你有没有也没关系，然后怎么做就怎么做"），**一期不做重点**

### X4. Mira Managed Agents API 对齐
**本质**：Catwork 的 agent 运行时必须走 Mira Managed Agents API，不另起 runtime。
**API 4 步工作流**（对齐 <https://platform.claude.com/docs/en/managed-agents/quickstart>）：
1. `POST /v1/agents` —— 创建 agent，传 `name / model / system / tools / mcp_server / skills / description / metadata`
2. `POST /v1/environments` —— 创建 environment，传 `config.type` (cloud) + `config.networking`
3. `POST /v1/sessions` —— 启 session，绑定 `agent_id + environment_id`
4. `POST /v1/sessions/:id/events` —— 发消息 + `GET /v1/sessions/:id/stream` 读 SSE
**字段映射**：
- Mira `Agent.name` ← Catwork.name
- Mira `Agent.model` ← Catwork.model
- Mira `Agent.system` ← Catwork 的 `.claude/CLAUDE.md` (C7 Persona)
- Mira `Agent.tools` ← 工具引用列表（如 `agent_toolset_20260401`）
- Mira `Agent.mcp_server` ← Catwork 的 `.claude.json` (C3 Connectors)
- Mira `Agent.skills` ← Catwork 的 `.claude/skills/` (C5)
**不做**：
- `callable_agents` —— Mira 暂不支持，对应砍掉 C6 Subagents
- `datasources / tasks / dispatch` —— 这些在 Mira API 里不存在，是 Catwork 的 UI 层扩展，不进 agent 本体

### X5. Environment
**本质**：agent 运行环境的独立资源。和 Agent 解耦：Agent 定义"是谁、会什么"，Environment 定义"跑在哪、有什么权限"。
**一期方案（轻量）**：
- 每个 Catwork 创建时自动建一个 default environment：`{type: cloud, networking: unrestricted}`
- 用户**不感知** environment，UI 上不暴露
- 数据模型里 `Catwork.environment_id` 字段存在，一期 = 自动创建的 default env id
- 当 Mira 沙箱真正支持多 environment 选项（dev/prod/受限网络 /资源配额）时，再放开 UI
**后续可能做的**：
- UI 暴露 environment 选择器
- 允许多个 Catwork 共享一个 environment
- 允许同一个 agent 在不同 environment 里测试

### X6. 内部共建流程（非代码 feature）
**本质**：让合作团队能参与 Mira 开发但不脱离设计主线。
**范围**：
- 代码合到主仓库（不单独 fork）
- 设计阶段合作团队是**需求方**
- 开发阶段合作团队是**研发**
- 核心团队 review 方案和 PR
- DAU 归属 Mira 整体

---

## 七、跨组字段对齐清单（待定）

> **前置认知**：Catwork 和 Agent 是两个实体（见第八节）。Catwork 是容器，Agent 是装配层。下表按字段归属标注 **「实体·所属」**。
>
> A 组管 **Catwork 容器字段**；B 组管 **Agent 装配字段**（也包括 Catwork 容器字段的编辑入口）；C 组管 **Agent 装配字段 + Catwork 生命周期字段**。

### Catwork 容器字段（A 组主责）

| 字段 | A 组 · Catwork 语义 | B 组 · 控制面语义 | C 组 · 管理面语义 |
|---|---|---|---|
| `id` | Catwork id | 同 | 作为 agent 的外键锚点 |
| `agent_id` | 指向 default Agent（一期 === id） | 读取用 | 同 |
| `name` | Catwork 名称 | 同 | agent 展示名 |
| `description` | Catwork 描述 | 同 | agent 展示描述 |
| `author` | creator 用户 id = owner | 同 | 同 |
| `bu` | 可空；自建=null，clone 时 = 源 template.bu | 同 | trace 过滤 key（Mira 超级 BU 不过滤） |
| `cloned_from` | 可空；非 null 时存 `{family_id, version}` | 读取用，显示升级提示 | 读取用，关联 template |
| `sandbox_path` | 沙箱目录 | 读取用 | 读取用 |
| `created_at` / `updated_at` | 标准时间戳 | 同 | 同 |

### Agent 装配字段（B 组主责；一期 Catwork 同步 stub 预留）

| 字段 | A 组 · 第一期处理 | B 组 · 控制面语义 | C 组 · 管理面语义 |
|---|---|---|---|
| `persona` (CLAUDE.md) | 空占位文件 | C8 编辑 | M2 Persona tab 编辑 |
| `model` / `model_strict` | 预留 | C9 Model Switch | M2 Persona tab 编辑 |
| `skills` | 预留空数组 | C5 CRUD | M2 Capabilities tab 嵌入 |
| `datasources` (view) | 预留 | C2 聚合视图（cli/mcp/skill/session 四源） | M2 Capabilities tab 嵌入 |
| `connectors` (mcp_server) | 预留 | C3 CRUD（存 `.claude.json`） | M2 Capabilities tab 嵌入 |
| `tasks` (含 manual / heartbeat / fixed / model-schedule) | 预留空数组 | C4 CRUD（底层 sh 脚本） | M2 Tasks tab 配置 + 随 template 下发 |
| `dispatch` | 预留空数组 | C6 配置 | M2 Dispatch tab 绑定 |
| `api` | 预留空对象 | 不暴露 | M2 Publish tab 管理 |
| `environment` | 预留空对象 | C9 部分 | M2 Environment tab |

---

## 八、数据模型

> 这一节用伪 TypeScript 定义核心实体及其关系。**字段用来划清边界**，类型是约定俗成的 hint，不是严格的研发 schema。

### 实体关系总览

```
BU ──┬── 拥有 ── User (多个)
     └── 拥有 ── Catwork (多个)      ←────── 从 Template clone
                    │
                    │  1:1 (一期) / 未来也许可 N:N
                    ▼
                  Agent (独立实体)   ──────▶ 发布到 Template (Gallery)
                    │
                    ├── 1:N ── Skill
                    ├── 1:N ── Subagent
                    ├── 1:N ── Datasource
                    ├── 1:N ── Connector
                    ├── 1:N ── Task
                    ├── 1:N ── Dispatch
                    └── 1:1 ── Persona (CLAUDE.md)

Catwork (容器层)
  │
  ├── 1:N ── Session ── 1:N ── Message (含 Attachment)
  │              │
  │              └── 1:N ── Trace ── 1:N ── Span
  │
  └── 1:1 ── 沙箱目录 (files / `.claude/` 资源落盘处)
```

**核心拆分**：Catwork 是**纯容器**（归属、身份、沙箱），Agent 是**独立实体**（装配能力）。一期两者 1:1 且同 id，但字段边界清晰 —— 装配字段只属于 Agent，容器字段只属于 Catwork。

### Catwork（容器层 · `catworks` 表）

```ts
Catwork {
  id:            string              // "cw_xxx" — 容器 id
  agent_id:      string              // 外键 → agents.id
                                     //   一期每个 Catwork 创建时同步建一条 Agent,所以值唯一;
                                     //   二期可能替换为 catwork_agents 关联表(N:N)
  name:          string
  description:   string
  author:        user_id             // ★ 所有者 = 创建者,Catwork 是个人级资产
                                     //   同一用户可以有多个 Catwork;不跨用户共享
  bu:            string?             // ★ 可空。
                                     //   null          = 自建,用户个人私有,不属于任何 BU
                                     //                   (只有 Mira 超级 BU 能 trace)
                                     //   "<bu_key>"    = 从 BU template clone 而来,
                                     //                   可被该 BU 的 admin trace
  cloned_from:   {
    template_family_id: string       // 来源 template 的 family id
    template_version:   int          // clone 时的版本号
  }?                                 // null 表示自建;非 null 表示从 template clone
  created_at:    timestamp
  updated_at:    timestamp
  sandbox_path:  string              // 对应的沙箱目录
}
```

Catwork **不再携带任何装配字段**（skills / tasks / persona 等都在 Agent 里），也**不需要任何状态机** —— Catwork 是用户的个人工作容器，要么存在要么被删除。发布和版本迭代是 Template 的事，不是 Catwork 的事。容器关心的只有四件事：**谁的**（author）、**从哪来**（cloned_from / bu）、**放在哪**（sandbox_path）、**指向哪些 agent**（agent_id → 二期 agent_ids）。

**BU 归属的关键规则**：
- **用户自建**的 Catwork → `bu = null`，纯私有，只有 Mira 超级 BU admin 能 trace
- **从 BU template clone**的 Catwork → `bu = 源 template 的 bu`，本 BU admin 可以 trace（但**不能编辑**）
- 用户无法手动修改 `bu` 字段 —— 归属由 clone 路径决定

**单人归属原则**：Catwork 没有 "成员"，没有 "共享"。`author` 就是 owner，除 owner 本人外没人能读写这个 Catwork 里的 session / files / agent。用户要把自己的 agent "分享" 给别人用只有两条路径：
- **发布到 Gallery** —— 别人 clone 一份独立实例到自己名下
- **通过 API 或 Dispatch 对外服务** —— 别人以 "消费者" 身份调用这个 agent，但不拥有它

### Agent（装配层 · `agents` 表）

```ts
Agent {
  id:            string              // 独立实体 id
  // 注：一期没有 catwork_id 反向引用 — 关系由 Catwork.agent_id 单向维护
  //     二期 N:N 时反向关系走 catwork_agents 关联表,不是 Agent 的字段

  // —— 对齐 Mira Managed Agents API 的核心字段 ——
  //     (POST /v1/agents 传的 body 字段)
  name:          string              // agent 名称
  description:   string?
  system:        string?             // = persona = CLAUDE.md 内容
  model:         string?             // "claude-sonnet-4-6" / "claude-opus-4-6" ...
  tools:         ToolRef[]           // [{type: "agent_toolset_20260401"}] 等工具引用
  mcp_server:    McpServerRef[]      // = connectors,存在 .claude.json
  skills:        Skill[]             // 对应 .claude/skills/
  metadata:      Record<string,any>? // 开放字段

  // —— Catwork 包装字段(Mira API 里没有,UI 层扩展)——
  model_strict:  bool                // true = 强指定不可切
  datasources:   DatasourceView[]    // 聚合视图(从 cli/mcp/skill/session 四源投影),非独立存储
  tasks:         Task[]              // 底层存 /tasks/*.sh
  dispatch:      Dispatch[]          // 存 /dispatch/*.json
  api:           ApiConfig?
  environment_id: string?            // 指向独立 Environment 实体(一期默认 cloud+unrestricted)

  // —— 注：subagents 字段一期不做 ——
  //     因为 Mira Managed Agents API 的 callable_agents 暂不支持

  created_at:    timestamp
  updated_at:    timestamp
}
```

**Mira Managed Agents API 对齐**：Agent 对外暴露的字段（`name/model/system/tools/mcp_server/skills/description/metadata`）和 Mira `POST /v1/agents` 完全一致，调 API 时直接按字段映射；其余 Catwork 扩展字段（datasources view / tasks / dispatch / api / environment_id）属于 **UI 层包装**，不进 Mira agent 本体。

**一期关系**：`catworks` 和 `agents` 两张独立表，通过 `Catwork.agent_id` 外键关联。一期每创建一个 Catwork 就同步 insert 一条 Agent，两表 1:1 对应，但**表结构和 API 是完全分开的**。

**二期走向（N:N）**：当需要以下任一场景时，把 `Catwork.agent_id` 外键替换为 `catwork_agents` 关联表：
- **Agent 共享**：多个 Catwork 引用同一个 Agent（改 Agent 会影响所有引用者）
- **Catwork 挂多 Agent**：一个 Catwork 里可以切换不同 agent 人格
- **Agent 独立发布复用**：Agent 脱离 Catwork 独立存在，Gallery 里卖的是 Agent 本身

一期不做这些，**但不能在一期让业务逻辑假设 1:1** —— 比如 "从 session 找对应 agent" 这类查询要走 `session.agent_id` 直接查 agents 表，不能绕 `session.catwork_id` → `catwork.agent_id`，否则二期加关联表时要重写一堆查询。

### Session 与 Message

```ts
Session {
  id:              string            // "sess_xxx"
  catwork_id:      string            // 归属 Catwork,创建时绑定,不可变更
  agent_id:        string            // 当次对话使用的 agent,一期 === catwork.agent_id
  title:           string
  created_at:      timestamp
  updated_at:      timestamp
  messages:        Message[]
  channel_key:     string?           // dispatch 来源标识,用于同通道消息找到同一 session
  sdk_session_id:  string?           // Mira 对话 runtime 的 session id,用于 resume
}

Message {
  id:            string
  role:          "user" | "assistant"
  parts:         MessagePart[]       // text / thinking / tool_call
  attachments:   Attachment[]        // 拖进 chat 的资源 ref
}

Attachment {
  kind:          "file" | "skill" | "datasource" | "task" | "connector"
  ref:           string              // 根据 kind 不同:
                                     //   file   → 云端 URL (全局可寻址,跨 catwork 可访问)
                                     //   其他   → 资源 id,相对 session 当前 catwork_id 解析
  display_name:  string
}
```

**File 和其他资源的区别**：
- **File 是 Catwork 的资产** —— 创建时归属创建它的 Catwork，物理存在 tors 云端，每个 file 有一个全局唯一 URL。
- **Session 只是引用** —— Attachment 存的是**这个 URL**，不是"session 持有 file"。URL 天然跨 Catwork 可访问（权限 OK 的前提下）。
- **其他资源**（skill / task / datasource / connector）是 Agent 的装配字段，按 id 在**当前 session.catwork_id 所属的 Agent** 里解析。

**Session 不可迁移**（已确认砍掉 move in / move out / switch）：
- Session 创建时绑定 `catwork_id`，此后**不可变更**
- 原因：session 与 Catwork 的 system prompt / skills / tools 强绑定，上下文不连续 —— 迁移有损且无实际意义
- 替代路径：把 `session.jsonl` 挂载为目标 Catwork 的一个 datasource（C2 session 类来源），agent 可 refer 但不继承工具链路

**Workspace 共享模型**：
- **同一 Catwork 内**：所有 session 共享同一个 workspace 目录（`/home/mira-<catwork>/workspace/`）。session 是无状态的纯对话，`ls` 看到的是 Catwork 级文件，跨 session 可见
- **跨 Catwork**：各 Catwork 的 workspace 完全隔离。agent 的主动能力（Read/Grep/Glob）只能读写自己沙箱内的文件
- **File URL**：文件在 tors 云端有全局唯一 URL。Session 的 Attachment 存的是 URL。同一用户可以在任何 Catwork 里通过 URL 打开自己上传的文件（权限检查走 owner，不走 Catwork 归属）—— 但这是**用户浏览历史链接**的便利，不是 agent 的主动读取能力

**设计意图**：Session 是 Catwork 内的对话记录，不是可搬运的独立资产。跨 Catwork 的知识传递走 datasource 挂载（session.jsonl → C2 session 类来源）而非 session 搬家 —— agent 能 refer 到对话内容，但工具链路不延续。

### Task（含原 Command）

```ts
Task {
  name:             string           // slug,用于 /<name> 触发
  description:      string
  trigger:          "manual" | "heartbeat" | "fixed" | "model-schedule"
  schedule:         string?          // cron 格式,fixed 和 heartbeat 共用
                                     //   fixed:     "0 9 * * MON"
                                     //   heartbeat: "*/10 * * * *"
  body:             string           // prompt 主体
  preset_refs:      Attachment[]?    // 预设附件(datasources / files)作为默认上下文

  // —— 运行状态 ——
  last_run_at:      timestamp?
  last_session_id:  string?
  next_run_at:      timestamp?       // heartbeat/model-schedule 用
}
```

**`fixed` 和 `heartbeat` 的字段相同,区别在 runtime 语义**：
- `fixed`：到点跑 body,输出就是本次的业务结果
- `heartbeat`：到点跑 body,body 里做条件判定 —— 不满足就等下次 tick,满足才触发"真正动作"（比如调用某个 tool、创建子任务、发消息）

这个差异由 `trigger` 驱动,不靠独立字段存储。

### Skill / Subagent

```ts
Skill {
  name:          string
  description:   string              // 触发场景描述
  body:          string              // SKILL.md 内容,runbook + 代码
  resources:     string[]            // 辅助资源文件相对路径
}

Subagent {
  name:              string
  description:       string
  prompt:            string          // 子 agent 的 system prompt
  tool_allowlist:    string[]?       // 独立 tool 权限
  model:             string?         // 独立模型(可选)
}
```

### Datasource / Connector

```ts
Datasource {
  id:            string              // "<type>/<name>",全局唯一
  type:          "aeolus" | "hive" | "sentry" | "lark_sheet" | "cis-core" | "custom"
  name:          string
  display_name:  string?
  description:   string              // 用于 prompt 注册时披露给 agent
  config:        Record<string, unknown>  // type-specific
  schema: {
    dimensions: { key, label, type, values? }[]
    metrics:    { key, label, unit?, agg? }[]
  }
  // —— demo 模式字段(生产模式为空)——
  _demo_note:    string?
  sample_rows:   Record<string, unknown>[]?
}

Connector {
  id:            string              // "<type>/<name>"
  type:          "slack" | "gmail" | "github" | "notion" | "feishu_notify" | "custom_mcp"
  name:          string
  display_name:  string?
  description:   string
  status:        "connected" | "needs_auth" | "disabled"
  config:        Record<string, unknown>  // `_`前缀字段=secret,不进 agent 视野
  actions:       { name, description }[]
}
```

**Connector 与 Datasource 是独立实体**：同一个外部系统（比如 GitHub）既可以作为 datasource（读 repo 的 issues / PRs）也可以作为 connector（写 issue / 评论），但它们在数据模型层不相互引用。Agent 眼里它们就是两种独立工具，会自己组合使用。这保持两边的实现和配置可以独立演进。

### Dispatch

```ts
Dispatch {
  id:               string
  type:             "feishu" | "slack" | "webhook" | "email"
  enabled:          bool
  config: {
    app_id:             string?
    app_secret:         string?      // secret
    encrypt_key:        string?      // secret
    default_chat_id:    string?
    // ... type-specific
  }
  bound_agent_id:   string?          // 入站消息交给哪个 agent 处理
}
```

### Trace / Span

```ts
Trace {
  id:                  string
  catwork_id:          string        // 冗余,便于按 workspace 过滤
  agent_id:            string        // 当次对话的 agent,一期 === catwork.agent_id
  session_id:          string
  subagent_name:       string?       // 如果走了 subagent
  query_preview:       string        // 首条 user message 前 120 字
  status:              "running" | "success" | "error"
  start_time:          timestamp
  duration_ms:         number
  total_input_tokens:  number
  total_output_tokens: number
  spans:               Span[]
}

Span {
  id:          string
  trace_id:    string
  parent_id:   string?
  name:        string                // "llm_call" / "tool_call" / "subagent_task" / "root"
  type:        "root" | "llm" | "tool" | "subagent"
  status:      "running" | "success" | "error"
  start_time:  timestamp
  duration_ms: number
  input:       any                   // tool input / prompt messages
  output:      any                   // tool result / assistant text
  metadata:    Record<string, any>?
}
```

### BU / User / Template

```ts
BU {
  key:         string                // "finance" / "hr" ...
  label:       string
  budget_cny:  number?
  members:     { user_id, role }[]
}

User {
  id:            string
  name:          string
  email:         string
  sso_subject:   string
  bus:           { bu_key, role: "admin" | "editor" | "viewer" }[]
}

Template {
  id:                  string        // "tpl_xxx_v1" — 每个版本一条独立记录
  family_id:           string        // "tplfam_xxx" — 同系列版本共享的 family id
  version:             int           // 1, 2, 3, ...
  is_latest:           bool          // 当前 family 下是否是最新版

  bu:                  string        // 发布到哪个 BU 的 Gallery
  published_by:        user_id       // 发布者必须是该 BU 的 admin
  published_at:        timestamp
  changelog:           string?       // 相对上一版的变更说明(v1 为空)

  name:                string
  description:         string
  category:            string        // "finance" / "devtools" ...
  preview:             string?       // 示例会话 / 截图

  // —— Agent 字段快照(clone 时复制给新 Agent instance)——
  agent_snapshot: {
    name, description, system, model, model_strict, tools, metadata,
    skills, mcp_server (connectors),
    datasources (view), tasks, dispatch, api, environment_id
  }
}
```

**Template 是版本化的** —— 同一个 `family_id` 下有多个 version 记录，**每个版本是独立一行**，老版本永远保留（因为可能还有用户的 Catwork 指向老版本）。`is_latest` 标记用于 Gallery 列表只展示最新版。

**只有 BU admin 能发布 template**：
- 普通用户**不能**把自己的 Catwork 发布到 BU Gallery。用户要分享自己的 agent，只能走 API / Dispatch 点对点服务，或者请对应 BU 的 admin 基于自己的 agent 帮忙发一版。
- BU admin 创建 template：可以从零手搭 agent 后发布，也可以把自己开发的 Catwork 导出成 template。
- BU admin 更新 template：在已有 family 下 `INSERT` 一条新 version（老版本仍保留），`is_latest` 翻转。

**Clone 流程**：
1. 创建新 Catwork，`bu = template.bu`，`cloned_from = { template_family_id, template_version }`
2. 创建新 Agent instance，字段 = `template.agent_snapshot`
3. `new_catwork.agent_id = new_agent.id`

**升级流程**（详见交互 10）：
1. 用户 Catwork 检测到 `cloned_from.template_version < latest_version`
2. 前端提示 "有新版本可升级"
3. 用户手动点击升级 → 新 version 的 `agent_snapshot` **覆盖**当前 Agent 的字段
4. 用户本地对 Agent 字段的修改**会被覆盖**（一期简单策略；二期可以考虑字段级三路合并）
5. Catwork 的 files / sessions 不动

### 存储位置

| 实体 | 存储 |
|---|---|
| Catwork 元数据（容器字段） | 数据库 · `catworks` 表 |
| Agent 元数据（装配字段） | 数据库 · `agents` 表（`Catwork.agent_id` 外键 → `agents.id`） |
| Environment | 数据库 · `environments` 表（Mira Managed Agents API 独立资源） |
| Catwork home 目录内容 | tors 云端持久化的 `/home/mira-<catwork>/` 目录（每个 file 有全局 URL） |
| Session / Message | Mira 数据库（沿用 Mira 既有 session 存储） |
| Trace / Span | Mira 数据库或 trace 专用存储 |
| BU / User | Mira 既有用户系统 |
| Template | 数据库 · `templates` 表 + `agent_snapshot` blob |

### home 目录 ↔ 产品概念速查

Catwork 的 home 目录严格对齐 Claude Code 官方布局（<https://code.claude.com/docs/en/claude-directory>）。产品概念和物理路径的对应：

```
/home/mira-<catwork>/
├── .git/                              ← Catwork 可 push 到 codebase 备份
├── bin/                               ← C2 Datasource (cli 类来源)
│   └── aeolus-cli
├── .config/                           ← cli 配置
│   └── aeolus-cli/config.yaml
├── .claude.json                       ← C3 Connectors (mcp_server 字段)
│                                        + C2 Datasource (mcp 类来源)
├── .claude/
│   ├── CLAUDE.md                      ← C7 Persona (= Agent.system)
│   ├── commands/                      ← 原 Commands,已并入 C4 Tasks (manual 类)
│   ├── skills/                        ← C5 Skills (= Agent.skills)
│   │                                    + C2 Datasource (skill 类来源)
│   └── projects/                      ← Claude Agent SDK 的 session 存储
├── dispatch/                          ← C6 Dispatch (一个 bot 一个 json)
│   └── bot-<id>.json
├── workspace/                         ← C1 Files (= --add-dir 挂载点)
│   └── <用户上传的文件,agent 生成的中间文件>
├── sessions/                          ← C2 Datasource (session 类来源)
│   └── <挂载的外部 session.jsonl>
└── tasks/                             ← C4 Tasks (底层 sh 脚本)
    └── <name>.sh
```

**设计原则**：
- **产品概念和物理存储解耦** —— C2 Datasource 是用户心智的统一入口,但底层异构地分布在 `bin/`、`.claude.json`、`.claude/skills/`、`sessions/` 四处
- **Catwork 天生是一个 `/home/mira-<catwork>/` 目录** —— 所有 C 系列 sub 的存储都在这个目录里,Catwork 删除 = 整个目录删除
- **home 目录持久化** —— tors 云端持久化,跨 session 不丢;用户甚至可以 `git push` 整个 Catwork 到 codebase 备份

**一期存储决策**：`catworks` 和 `agents` **两张独立表**，外键关联。一期创建 Catwork 时同步创建一条对应的 Agent 记录，`Catwork.agent_id = Agent.id`。字段名干净，API 层天然分两个 endpoint。

**二期走向（N:N）**：当需要 "一个 Agent 被多个 Catwork 引用" 或 "一个 Catwork 挂多个 Agent" 时，把 `Catwork.agent_id` 外键换成 `catwork_agents` 关联表（`catwork_id`, `agent_id`, `role`）。一期表结构不需要预建这张关联表，但**不要在一期让任何业务逻辑假设 1:1** —— 比如 "从 session 找对应 agent" 这类查询要走 `session.agent_id` 直接查 agents 表，而不是绕路 `session.catwork_id` → `catwork.agent_id`。这样二期加关联表时，业务逻辑零改动。

**File URL 模型**：files 在 tors 云端，每个 file 有全局唯一 URL。Session 里的 `Attachment.ref`（kind=file）存的就是这个 URL。用户在任何 Catwork 的 session 里都能通过 URL 打开自己曾上传的文件 —— 这是用户级的文件访问便利，不代表 Catwork 之间共享 workspace。

**权限前提 · 用户级**：Catwork 是**个人级资产**，归属单个用户（author = owner）。同一用户可以拥有多个 Catwork。File URL 的权限检查只看 **"这个 file 的 owner 是不是当前请求用户"**，跟 Catwork / session 归属无关 —— 用户自己的 file，无论在哪个 Catwork 的哪条 session 里被引用，自己都能访问。但 agent 的**主动读写**边界严格限定在本 Catwork 的沙箱内。

**Catwork 天生单人** —— 产品形态里**没有"多人协作共用一个 Catwork"**。BU 是治理归属（Dashboard 统计、预算归属、Gallery 发布渠道），不是访问控制层。

---

## 九、关键设计交互

> 这些是把前面零散 feature 串起来的核心用户流程。每条用"**触发 → 反应 → 结果**"三段式。

### 交互 1 · 新建 Catwork

**触发**：Sidebar 顶部点 `+ New Catwork`（空白）或 Gallery 里点 `Use this template`（从模板 clone）。

**反应**：
- 弹出命名对话框（name + description + 归属 BU）
- 后端两步建记录：
  1. `INSERT catworks` —— 分配 id、沙箱目录
  2. `INSERT agents` —— 装配字段为空（空白）或 = `Template.agent_snapshot`（clone）
  3. `UPDATE catworks SET agent_id = <new agent.id>`
- Clone 模板的情况：新 Agent 的 persona / skills / datasources / connectors / tasks 等字段从 `Template.agent_snapshot` 全量复制

**结果**：Sidebar 切到新 Catwork；文件树要么为空要么显示模板带来的内容；如果模板里有预置 manual task，用户立即能在 chat 里 `/task-name` 触发。

---

### 交互 2 · 把东西塞进 Catwork

**触发**（两类）：
- **本地文件**：从系统文件管理器拖进 sidebar 文件树区域，或点上传按钮
- **外部链接**：把飞书 doc/sheet/wiki 或其他 URL 粘贴进文件上传区

**反应**：
- 本地文件 → 直接写入 Catwork 沙箱目录
- 外部链接 → 服务端识别域名 → 生成 `<name>.url` 文件落盘（内容是 metadata + target URL）

**结果**：文件树出现新条目；Catwork 里任何一次对话里，当 agent 读到一个 `.url` 文件时，runtime **自动**路由到对应 loader（飞书 API / fetch + 正文提取 / ...），返回正文而不是 URL 字符串本身。

---

### 交互 3 · 用 `/task-name` 触发 manual task

**触发**：用户在 chat 输入框打 `/`，浮起候选列表（来自当前 Catwork 的 manual task 和 fixed cron task 也可）。选一条后 → 自动补全为 `/task-name `，用户可追加参数 → 回车发送。

**反应**：
- 服务端拦截 `/task-name args` → 查找 `tasks[]` 里对应 task
- 把 `task.body` 作为 user message 注入（`$ARGUMENTS` 占位替换为 args）
- 把 `task.preset_refs` 里的附件一起挂上
- 进入 agent runner

**结果**：一次完整的 agent turn，流式输出到当前 session。等同于用户"手打了一段预设 prompt + 附件"，但一个斜杠就搞定。

**心智**：`/` 是人调 agent 的快捷方式；task 是 agent 被调起的唯一原语。用户 chat 里手写的 prompt 和 `/task-name` 是同一条路径，只是一个 ephemeral 一个具名。

---

### 交互 4 · 从 Catalog 装 datasource / connector

**触发**：Datasource 或 Connectors tab 点 `+ Add`。

**反应**：
- 弹出 catalog 浏览器（按 type 分组 + 已安装徽标）
- 用户选一条 → 点 `Use this`
- 后端根据 catalog 条目的来源类型，**落到对应的物理路径**：
  - **Datasource - cli 类** → 复制 cli 到 `/home/mira-<catwork>/bin/`，配置到 `.config/`
  - **Datasource - mcp 类** → 追加 mcp server 条目到 `.claude.json`
  - **Datasource - skill 类** → 复制 skill 目录到 `.claude/skills/`
  - **Connector (mcp_server)** → 追加 mcp server 条目到 `.claude.json`（C3 Connectors 存储）

**结果**：
- 对应 sub panel 的分组列表出现新条目（Datasource 视图从 `bin/` + `.claude.json` + `.claude/skills/` + `sessions/` 四处聚合刷新）
- **下一次**对话时，agent 启动前 runtime 扫到这条新资源，自动：
  - cli 类 datasource → 作为 `bin/` 下的可执行文件，agent 可通过 Bash tool 调用
  - mcp 类 datasource / connector → 作为 Mira `Agent.mcp_server` 字段的一条，启动 session 时注入
  - skill 类 datasource → 作为 `Agent.skills` 字段的一条，Mira runtime 原生加载
- Agent 不需要任何提示就能看到新工具

---

### 交互 5 · 拖资源进 chat 做显性上下文

**触发**：用户在 sidebar 按住一条 file / skill / datasource / task，拖到 chat 输入框。

**反应**：
- 输入框出现一个 attachment chip（带 kind 小图标）
- 用户可以拖多条，也可以点 × 移除
- 发送时，客户端把 attachments 展开成**结构化 prompt 头**，附在 user message 前面：
  ```
  [Attached files: X, Y]
  [Referenced datasources — use query_datasource tool: id=..., schema=..., demo_note=...]
  [Referenced tasks — treat body as user intent: name=..., body=...]

  <user's actual message>
  ```

**结果**：agent 收到的是一段带明确"这一轮有哪些资源可用 + 如何操作"的 user message，不需要去 list 或猜。

**和"自动可用"的区别**：
- **自动可用**（交互 4 结果）：装了 datasource 后，agent 永远知道它存在，想用就用
- **显性拖入**（本交互）：用户**指名道姓**告诉 agent "这一轮就用这个"

---

### 交互 6 · 用户把 Catwork 开成对外服务（API / Dispatch）

**触发**：用户开发完自己的 Catwork 后，想让别人作为服务调用（但不走 Gallery —— 发布 template 是 BU admin 的事）。打开 M2 Publish tab（或控制面对应入口）。

**反应**（两条独立路径，可选其一或同时）：
- **开 API** → 点 `生成 API key` → 后端发 key → 填 rate limit / 有效期 / 消费者白名单（M2 Users tab）→ 得到可调用的 endpoint
- **绑 Dispatch** → 在 C7 Dispatch 里创建一个飞书 bot / webhook 通道 → `bound_agent_id = 当前 Catwork.agent_id` → 外部消息通过 Dispatch 进 agent

**结果**：
- API 调用方拿到 key 后可以用 HTTP 调这个 agent，每次调用作为一条新 session
- Dispatch 的消费方（飞书群成员）可以直接 @ bot 聊天，复用 session channel key 连续对话
- 所有调用自动走 trace，owner 和有权限的 BU admin 能看到

**不是发布 template 的路径**：这里用户是把自己的 **个人 agent** 暴露为一个点对点服务，不会出现在 BU Gallery 里，别人也不能 clone 这个 Catwork 成为自己的。要让"能力传播"走 Gallery 路径，只能由 BU admin 重新搭一个 template 发出去（见交互 10）。

---

### 交互 7 · 外部消息通过 Dispatch 进来

**触发**：有人在飞书群 @了这个 agent 对应的 bot。

**反应**：
- Dispatch worker（飞书 WebSocket 长连接）收到消息
- 按 `channel_key`（= 群 id + 话题 id）查找**历史 session**
  - 找到 → 追加到现有 session（上下文连续）
  - 没找到 → 新建 session，绑定到 `Dispatch.bound_agent_id` 指向的 Catwork
- 把消息内容作为 user message 塞进 session → 走 agent runner
- Agent 的 assistant 回复通过 Dispatch worker 反向发回飞书群

**结果**：
- 飞书群里 agent 像普通用户一样回话
- Mira UI 的 session 列表里出现这条来自 dispatch 的对话（带 channel 徽标）
- Trace 照常记录

---

### 交互 8 · Admin 追溯一次异常

**触发**：用户反馈"我昨天那条 `/xxx` 跑错了"，admin 在 M3 Traces 搜索该用户 logId。

**反应**：
- Trace 列表过滤到该用户 + 时间窗
- 点开目标 trace → 展开 span 树
- 每个 span 可以看 input / output / duration / token usage
- LLM span 可以看完整 messages 数组

**结果**：admin 能定位到"是在哪一步出错的"（某个 tool 返回异常 / LLM 给了错指令 / subagent 失败）。

---

### 交互 9 · Template 引导用户上手

**触发**：用户通过交互 1 从模板 clone 了一个新 Catwork。

**反应**：
- 新 Catwork 打开后，Tasks tab 里已经有预置的 manual task（模板作者放的"引导动作"）
- Chat 输入框打 `/` 能看到这些预置 task 的名字
- 这些 task 的 description 应该写清楚"我能做什么"

**结果**：用户不需要读文档也不需要自己想 prompt，直接 `/weekly-report` / `/digest` 就能看到 agent 的典型能力。**Template 的价值不是"预装了哪些字段"，而是"预装了哪些 /命令让人上手"**。

---

### 交互 10 · BU admin 发布 template 新版本 → 用户升级

**触发（BU 侧）**：BU admin 在自己的 Finance Bot Catwork 上改了 persona 和 skills，想让本 BU 已 clone 过这个 template 的所有用户都吃到更新。打开 M2 Publish tab，点 `发布新版本`。

**反应（BU 侧）**：
- 弹出对话框，让 admin 填 `changelog` 说明这次改了什么
- 后端在同 `family_id` 下 `INSERT` 一条新 Template 记录：`version = 当前 max + 1`、`is_latest = true`、`agent_snapshot = 当前 Catwork 的 Agent 字段`
- 老版本的 `is_latest` 翻转为 `false`，但记录保留

**触发（用户侧）**：用户 Alice 曾经 clone 过这个 template v1，她的 Catwork `cloned_from = { family_id, version: 1 }`。下次 Alice 打开这个 Catwork 时：

**反应（用户侧）**：
- 前端查询：`latest_version(family_id) > cloned_from.template_version` → 是
- 控制面顶部出现升级提示条：`Template "Finance Bot" 有新版本 v2 可用 · {changelog} · [查看差异] [升级]`
- Alice 点 `查看差异` 看到新版本的字段变更对比（一期可以只显示 changelog 文本，不做字段 diff）
- Alice 点 `升级`

**反应（升级动作）**：
- 后端拉取 `Template[family_id, v2].agent_snapshot`
- **覆盖**当前 Agent 的所有装配字段（system / model / tools / skills / mcp_server / datasources view / tasks / dispatch / api）
- 更新 `Catwork.cloned_from.template_version = 2`
- **不动** Catwork 的 files、sessions、author、bu、id —— 这些是用户个人的

**结果**：Alice 的 Catwork 现在使用 v2 的能力集，老对话历史照旧。如果 Alice 之前自己改过某个 skill，**会被新版本覆盖丢失**（一期明确告知用户这点；二期可考虑字段级三路合并）。

**设计意图**：template 是 BU admin 持续维护的 "能力包"，用户用的是"我 subscribe 了 BU 的这个能力包"。subscribe 动作是 clone，update 动作是升级。升级不回滚 files / sessions，因为那是用户自己的资产，不属于 template 范畴。

---

### 交互 11 · BU admin 跨用户 trace & debug

**触发**：BU admin Zhang 想知道 Finance BU 里谁在用自己发的 Finance Bot template、怎么用的、有没有出错。打开 M1 Dashboard 或 M3 Traces，顶部 BU 选成 `Finance`。

**反应**：
- 后端按 `Catwork.bu == "finance"` 过滤，返回所有从本 BU template clone 的用户 Catwork
- Dashboard 显示聚合指标：本 BU 下有 N 个用户在用、总调用 M 次、错误 P 次
- Traces 列表显示所有本 BU 下的 trace（跨用户聚合）
- 点开任一 trace → span 详情 → 看到完整的 LLM call / tool call / 错误信息
- Zhang 发现 `/weekly-report` 这个 task 对某类输入会 crash → 记下 bug

**BU admin 能做 / 不能做**：
- ✅ 看 trace 详情、span input/output、LLM messages
- ✅ 看用户 Catwork 的 Persona / Capabilities / Tasks tab（**只读**）
- ✅ 通过这些观察准备下一版 template 改什么
- ❌ 不能直接改 Zhang 看到的那个用户 Catwork 的任何字段
- ❌ 不能看 `Catwork.bu == null`（用户自建的个人 Catwork）或其他 BU 的 Catwork

**Zhang 下一步**：回到自己的 Finance Bot Catwork，改 skill fix bug，再走交互 10 发 v3。用户下次打开自己的 Catwork 会看到 v3 升级提示。

**设计意图**：BU admin 和用户之间是 "Platform vs Subscriber" 关系，不是 "Manager vs Employee" 关系。admin 不能直接动用户的 Catwork 保证了用户对自己 agent 的完整掌控；admin 能跨 trace 保证了 BU 层面有足够的 observability 迭代 template。

**Mira 超级 BU admin 的差别**：同样的操作，但不受 `Catwork.bu` 过滤 —— 能看所有用户的所有 Catwork（含 `bu=null` 的个人 Catwork）。用于系统级调试。

---

## 十、范围建议

三组并行，先上线 Catwork（folder 形态），每个 Catwork 内 session 共享 workspace / files；一期目标是拿出一个 **Catwork → 控制面 → 管理面**首尾打通的最小完整形态，让用户可以 **"新建 Catwork → 塞文件 → 装 skill → 用 `/task` 触发"**，BU 可以 **"发布给其他人用 → 管理员看到指标 / 维护者看到 trace"**。

### 发布节奏

1. **Catwork 形态（A 组）** —— 最快下周出，先让用户能创建 + 塞东西。A 组一期做完后，间隙去支持控制面需要的 workspace 能力。
2. **控制面（B 组）** —— 和 Catwork 并行开发，不 block A 组。**控制面可以"慢一点"**，因为逻辑单元复杂，需要更长的设计时间。
3. **管理面（C 组）** —— 平台先自用，**一个月内不对外**，先把"平台管理"做通。BU 上线那套流程（template 发布、BU Gallery、BU Dashboard、跨 BU trace 授权）在平台稳定后再做。后台一期**不用做得特别好看**。
4. **沙箱基础层** —— Mira 基建组在压测，**这周不全网上线**，预计下个月全网。

**关键约束**：管理面要分两批上 —— **平台管理先上**（让核心团队能用自己的管理面造出自己的 agent），**BU 管理后上**（把 template 发布流程、BU admin trace 权限等跑通）。

### 第一期必做（P0）

**A 组 · Catwork**
- W1 Catwork 生命周期（含完整字段预留）
- W2 Session ↔ Catwork 绑定（含默认 Mira Catwork、JSONL 导出替代迁移）
- W3 文件收集（含 `.url` 外链和 loader 路由）
- W4 对话拖拽（基础：file / skill / task）
- W6 沙箱接入

**B 组 · 控制面**
- C0 控制面外壳
- C1 Files
- C2 Datasource
- C4 Tasks 基础（含四种 trigger，manual 优先做通 —— 它是原 command 的承载）
- C5 Skills 基础（不含市场）
- C8 Persona
- C9 Model Switch

**C 组 · 管理面**
- M0 BU 上下文
- M1 Dashboard 指标卡（至少 deployed agents 数 + top agents 表）
- M2 Agents 列表 + 详情 5 个核心 tab（Persona / Capabilities / Tasks / Publish / Playground）
- M3 Traces 列表 + 详情 + span 详情

---
