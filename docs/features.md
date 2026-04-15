# Mira Project 形态 · Feature 清单

> **背景**：Mira 目前只有基建层（沙箱 / 存储 / SSO / 对话 runtime）和 chatbot 形态（单轮/多轮对话，无工作空间概念）。本文档描述要**从零新增**的 "Project" 形态 —— 在 Mira 基建上搭一层 workspace + 控制面 + 管理面，让 Mira 从"一个对话框"进化成"一个可装配的 agent 工厂"。
>
> 这份文档是 **feature 级别**的拆分，目的是分工认领 —— 谁做什么。粒度是"一个人（或小组）能 own 下来的独立交付单元"，不是研发 spec，不是排期。
>
> **UniSpace 当前代码不是基座** —— 只是设计和交互原型，用来对齐形态和字段。真实开发在 Mira 代码库里进行。

---

## 一、产品形态演进

```
Mira 现状 (chatbot)                     本文档新增的三层
─────────────────────────              ──────────────────────

[ 基建 ]                                [ 一 · Workspace ]
  ├─ 沙箱                               用户的工作文件夹
  ├─ 对话 runtime                             │
  ├─ 存储 (tors)                              │ 装控制面
  ├─ SSO / 身份                               ▼
  └─ manager agents (既有)              [ 二 · 控制面 ]
                                         把 workspace 装成 agent
[ chatbot ]                                   │
  一个对话框,无上下文归属                      │ 进管理面
                                              ▼
                                        [ 三 · 管理面 ]
                                         BU 对 agent 的治理
```

**核心命题**：在 Mira 基建之上，把"文件夹 → 装配能力 → Agent → 管理治理"这条产品主线从零建起来。

**关键约束**：
- **数据结构从第一天起对齐** —— workspace 的字段要预留给 agent，避免第二步返工。
- **Mira 基建复用** —— 沙箱、SSO、存储、对话 runtime 全部复用 Mira 现有，不重做。
- **Mira 既有的 manager agents** —— 管理面要跟它对齐/合并，不能另起炉灶。

---

## 二、团队分工建议

| 组 | 负责范围 | 核心输出 |
|---|---|---|
| **A 组 · 文件夹** | 一、Workspace 形态 | 用户第一眼看到的"文件夹",可以塞东西、对话 |
| **B 组 · 控制面** | 二、控制面装配层 | 让文件夹长出 skills / tools / tasks / 通道等能力 |
| **C 组 · 管理面** | 三、管理面 | BU admin 视角,跟 Mira 既有 manager agents 打通 |
| **横向** | 四、跨组 / 平台级 | 字段对齐 / 基建接入 / 共建流程 |

**并行开发前提**：三组在启动前必须一起开**字段对齐会**，把数据模型拍死（见第七节）。A 组第一期写的每个字段都要预留给 B/C 组用。

---

## 三、A 组 · Workspace 形态

> Workspace = 用户的工作文件夹 + 一次对话的上下文容器。第一期就是一个纯文件夹形态 —— 装东西、翻东西、基于它聊。但字段要为后面的 Agent 形态预留好。

### W1. Workspace 生命周期
**本质**：一个 workspace = 一个独立的工作上下文 + 一个预留的 agent 人格容器。
**范围**：
- 创建 workspace（名称、描述、可选从模板 clone）
- 切换 / 重命名 / 删除
- 列表 / 搜索
- Workspace 元数据（归属 BU、创建人、创建时间、最后活跃时间）
- **数据结构预留**：`model` / `system_prompt` / `skills[]` / `subagents[]` / `commands[]` / `datasources[]` / `connectors[]` / `tasks[]` / `dispatch` / `api` / `environment` —— 第一期全部可以为空，但字段必须存在
**归属**：A 组
**依赖**：Mira 存储 + SSO

### W2. 文件收集
**本质**：workspace 作为"把用户关心的所有东西都塞进来"的篮子。
**范围**：
- 本地文件拖拽上传
- 外部链接粘贴（飞书 doc/sheet/wiki、Notion、普通 URL）自动转换为 `.url` 文件
- 文件树浏览、搜索、预览、重命名、删除
- 上传目的地：**workspace 的沙箱目录**，不是 tors
**关键机制**：`.url` 文件的语义落地 —— agent 读取 `.url` 时自动按类型路由到对应 loader（飞书走飞书 API、普通 URL 走 fetch + 正文提取）。这条是 W2 的灵魂。
**归属**：A 组
**依赖**：Mira 沙箱、飞书 API、Mira 已有的文件上传链路（可能需要改造 upload 目的地）

### W3. Session 与 Workspace 绑定
**本质**：Mira 既有的 session 是无归属的，新形态下每个 session 都要绑定一个 workspace。
**范围**：
- Session 字段里加 workspace 标识
- 新建 / 切换 / 删除 / 重命名 session
- Session 持久化（每 workspace 独立）
- Session 列表按 workspace 范围过滤
- 流式输出 / tool call 可视化 / thinking 折叠（沿用 Mira 对话能力，但渲染在 workspace 外壳内）
**归属**：A 组（session 数据层需要跟 Mira 既有 session 对齐）
**依赖**：Mira 既有的 session 实现

### W4. 对话拖拽上下文
**本质**：用户把 workspace 里任何东西拖进 chat，作为这一轮的显性上下文。
**范围**：
- 拖文件 / skill / command / datasource / connector / task 进 chat
- `@` 触发引用弹窗（从文件树 + 资源列表过滤）
- `/` 触发 slash command 展开
- 发送前把 attachments 展开成**结构化 prompt 头**（不是纯文本 marker），让 agent 知道这是用户显性指定的上下文 + 知道以什么 tool 去操作这些资源
**归属**：A 组（基础形态：文件）+ B 组（其他资源类型随控制面 feature 同步扩充）
**依赖**：W2、C2-C7 的资源定义

### W5. Workspace 三栏外壳
**本质**：承载 workspace 的主界面 —— 左 sidebar、中 chat、右 preview。
**范围**：
- 三栏可调宽度布局
- Sidebar：workspace 切换 + 文件树 + sessions + promoted tabs（控制面 pin）
- 中间：Chat panel
- 右边：文件预览（md / 图像 / PDF / CSV 简单表 / 代码）
- Tab bar：多个打开的文件
**归属**：A 组
**依赖**：无

### W6. 沙箱接入
**本质**：每个 workspace 有独立文件系统 + 独立执行环境。
**范围**：
- 每个 workspace 一个独立沙箱实例
- 文件系统隔离
- Bash/Python 执行隔离
- （可选）独立网络权限
- （可选）资源配额
**归属**：A 组 × Mira 基建组
**依赖**：Mira 沙箱（目前在压测，按 Mira 的进度来）

---

## 四、B 组 · 控制面

> 控制面是 workspace → agent 的**装配层**。10 个 sub 不是 UI 装饰，而是 agent 能被装配的 10 个维度。每个 sub 回答三问：**为什么存在 / 用户怎么编辑 / agent 怎么执行**。
>
> **用户心智**："我先拖了文件（workspace），然后发现可以加工具（skill），可以让它定时跑（task），可以让它对外发消息（connector）" —— 渐进式发现，控制面一上线就从文件夹演变成 agent。

### C0. 控制面外壳
**本质**：承载所有 sub tab 的容器 + 管理用户的 sub 偏好。
**范围**：
- Sub-nav 列表（所有 sub tab）
- Sub 间切换、URL 同步
- Promoted tabs：用户可把常用 sub pin 到 sidebar 顶部
- 每个 sub 的"+ 新建"入口
**归属**：B 组

### C1. Files（文件）
**本质**：agent 的沙箱内读写状态 = 内部工作记忆。跟 W2 是同一份数据的控制面视角展开 view。
**范围**：
- 文件树 CRUD + 上传 + 预览 + markdown 编辑
- 多类型预览（md / 图像 / PDF / CSV / 代码）
- 搜索 + Grep
- Agent 视角：Read / Write / Edit / Glob / Grep 原生工具
**归属**：B 组（与 A 组共享底层数据）

### C2. Datasource（外部数据源 · 读）
**本质**：agent 的**外部只读数据句柄**。跟 Files 的边界：file 是沙箱内可读写的内部状态，datasource 是外部只拉不写的数据源。
**范围**：
- Datasource catalog：按 type 分组（Aeolus / Hive / Sentry / 飞书表格 / CIS-Core / 自定义）
- Install from catalog：把一份 datasource 配置收进 workspace（存储格式对齐后续 agent 字段）
- Uninstall / 编辑 config
- 每条展示 schema（dimensions + metrics + 描述 + demo note）
- Agent 视角的 3 个 MCP 工具：`list_datasources` / `get_datasource_schema` / `query_datasource`
- **透明降级**机制：demo 模式返 cached sample + `_demo_note` 让 agent 主动披露；生产模式才打真 API
- 拖拽进 chat → 结构化 prompt 注入（agent 知道这一轮有哪些 DS 可用）
**归属**：B 组
**依赖**：各种 type 的后端 handler（初期可以只做 1-2 种走真 API，其他走 demo 模式作为形态展示）

### C3. Connectors（外部动作通道 · 写）
**本质**：agent 的**外部写入动作句柄** = "带 credential 的 MCP server"。跟 datasource 镜像对称：datasource 拉数据，connector 做动作。跟 Dispatch 的边界：dispatch 是外部**进来**，connector 是 agent 主动**出去**。
**范围**：
- Connector catalog：按 type 分组（Slack / Gmail / GitHub / Notion / 飞书通知 / 自定义 MCP）
- Install 流程：选 type → 填 auth + config → 落盘
- Uninstall / 编辑
- Actions 列表展示（post_message / create_issue / send_email 等）
- Agent 视角：每个 installed connector 自动注册一个 `<slug>_invoke(action, params)` MCP 工具 + 一个 `list_connectors` 发现工具
- **Secret 字段 redaction**：敏感字段（token / secret）不进 agent 视野
- **透明降级**：demo 模式返 echo envelope + `_demo_note`；生产模式才打真 HTTP
**归属**：B 组
**依赖**：各 type 的 HTTP 客户端 + OAuth 接入（初期可以只做 1-2 种走真 API）

### C4. Commands（Slash 命令）
**本质**：用户侧的 prompt 缩写 —— "把一段常用 prompt 绑定到 `/name`"。
**范围**：
- Command CRUD（按 frontmatter + body 存储）
- 支持 `$ARGUMENTS` 占位
- 用户在 chat 里输入 `/name args` → 服务端展开为 body
- Command 列表展示 + 每条可预览
**归属**：B 组

### C5. Skills（能力 / 方法论）
**本质**：可复用的"如何做 X"操作手册 = 给 agent 看的 runbook。
**范围**：
- Skills 目录 CRUD（SKILL.md + 辅助资源文件）
- Skill frontmatter（name / description / 触发场景）
- SDK 原生识别：agent 在合适的时候自动加载 skill 内容到上下文
- Skill 市场：从全局 catalog 一键安装到 workspace（类似 datasource 的 install 模型）—— **可选，P1**
**归属**：B 组
**依赖**：Mira 对话 runtime 的 skill 加载机制

### C6. Subagents（代理 / 分工）
**本质**：主 agent 委派给带独立 prompt 和 tool 权限的子 agent。
**范围**：
- Subagent CRUD（frontmatter + prompt body）
- 配置 subagent 的独立 model / tool 权限 / 允许调用的其他资源
- Agent 视角：SDK `Task(name, prompt)` 工具调用
- Subagent 之间的级联（一个 subagent 调另一个）
**归属**：B 组
**依赖**：Mira 对话 runtime 的 subagent 调度能力

### C7. Tasks（预设工作流 + 触发器）
**本质**：prompt + trigger 声明 + 附件预设，可被召唤执行的"动作"。
**范围**：
- Task CRUD（frontmatter: name / description / trigger / schedule + body 作为 prompt）
- **三种 trigger type**：
  - `manual`：用户手动点 Run
  - `fixed`：用户自己设的 cron，到点唤醒
  - `model`：模型自己决定下次什么时候唤醒（每次跑完自己 set 下次时间）
- Run now：手动触发 → 创建 session + 塞 prompt + 走 agent runner
- Task 附件：可以预设 datasources / files / connectors 作为运行时默认上下文
- 运行历史（last run / last session id / 上次产出）
- **Fixed cron 的真实调度器**：server 起 in-process scheduler
- **Model-scheduled 机制**：agent 输出末尾带 `<<next_run:ISO>>` sentinel，runtime 捕获后写入 state，下次到点唤醒
**归属**：B 组
**依赖**：Mira 对话 runtime、一个轻量 scheduler（进程内即可）

### C8. Dispatch（入站通道）
**本质**：让**外部系统主动把消息送进 agent**（跟 connector 相反方向）。
**范围**：
- Dispatch type：飞书 bot / Slack bot / webhook / Email inbound
- 配置：app_id / app_secret / encrypt_key / 默认频道等
- 运行时：每个 dispatch 启动一个 worker，收到消息 → 创建或追加到对应 session
- Session channel 绑定：一个 dispatch 来的消息能找到它过去的 session
- 消息去重 / 重放保护
- 跟 M2 的"agent ↔ dispatch 绑定"相关（管理员指定某个 agent 接哪条 dispatch）
**归属**：B 组
**依赖**：Mira 既有的消息接入能力（如果有）

### C9. Persona（CLAUDE.md 人格）
**本质**：agent 的 system prompt = "我是谁，我的原则，我的上下文"。
**范围**：
- markdown 编辑器编辑 CLAUDE.md
- 作为 system prompt 前置到每次对话
- 保存后下次对话立即生效
**归属**：B 组

### C10. Model / Runtime Settings
**本质**：选模型 + 运行参数。
**范围**：
- Model picker（Opus / Sonnet / Haiku + custom）
- Permission mode（bypassPermissions / interactive / readonly）
- 每 workspace 独立的 settings
- Env vars 配置
- 默认 agent 持有的 tool 白名单 / 黑名单
**归属**：B 组
**依赖**：Mira 对话 runtime 的 model / option 注入点

---

## 五、C 组 · 管理面

> 管理面的主体是 **"BU 管理员对 agent 的治理"** —— 谁能发布、谁在用、质量如何、费用如何、出了问题怎么追溯。
>
> **关键对齐**：Mira 目前有 manager agents 形态，但它不是 project 形态的管理面。C 组的工作是把 manager agents 和 project 形态的 agent 概念**打通**（Mira 方案设计阶段就要考虑，不是后面返工）。
>
> **C 组的可能外部协作**：按会议精神，C 组的设计由核心团队把控，实现可能交给外部团队（如劲松那边）。需求方和实现方分离。

### M0. BU 上下文 / 身份
**本质**：把用户的真实身份 + 所属 BU 映射到整个管理视图。
**范围**：
- SSO 登录（复用 Mira 现有）
- 用户身份 / BU 列表 / 角色（admin / editor / viewer）
- BU 切换触发整个 admin 视图按该 BU 过滤
- 权限边界（viewer 只读、editor 能编辑、admin 能发布/删除）
**归属**：C 组
**依赖**：Mira SSO、Mira 的 BU / 权限数据

### M1. Dashboard
**本质**：BU 视角的平台健康概览。
**范围**：
- 指标卡：deployed agents 数 / API 调用（7d）/ Active users / Error rate / Cost (MTD)
- Top agents 表（本 BU 的 agent 按调用量排）
- Agent quality 表（satisfaction / avg turns / error rate）
- Recent activity 流（agent 状态变更、审核动作、API key 操作）
- Budget 卡（月度预算 / 已用 / 剩余 / 执行率）
- **指标来源**：从 traces 聚合，不是写死
**归属**：C 组
**依赖**：P3 Tracing 的聚合查询

### M2. Agents 管理（列表 + 详情）
**本质**：管理面的主战场 —— 对每个 agent 的全生命周期配置。
**范围（列表）**：按 BU 过滤 / 新建 / 删除 / 按状态筛选 / 搜索。
**范围（详情的 8 个 tab，每个都对应控制面的一个维度）**：
- **Persona**：name / description / icon / author / BU / model / system_prompt / 状态
- **Capabilities**：skills / subagents / commands 的嵌入式 CRUD
- **Workspace**：mounts / default_files
- **Environment**：runtimes / network 模式 / allowlist / env vars / MCP servers
- **Publish**：API keys 创建撤销 / rate_limit / usage
- **Dispatch**：绑定入站通道到这个 agent
- **Playground**：在 admin 页面直接跟 agent 对话测试
- **Users**：授权哪些用户能使用这个 agent
**核心约束**：Agent 详情的字段结构必须跟控制面 1:1 对应 —— 管理员在这里改的东西跟用户在控制面改的东西是**同一份数据**。否则就是两套模型。
**归属**：C 组
**依赖**：跟 Mira 既有 manager agents 数据模型打通

### M3. Review 审核流程
**本质**：agent 从 draft 升级到 live 前要过审核。
**范围**：
- 待审核列表（status = "review"，按 BU 过滤）
- 审核动作：approve / reject + comment
- 审核历史记录（谁、什么时候、决定、comment）—— 需要一个审计日志数据表
- 状态机：draft → review → approved → live → deprecated
- 通知：审核结果通知提交者（可用 connector 集成，也可以通过 Mira 既有通知）
**归属**：C 组

### M4. Traces 追踪
**本质**：全链路调用追踪 = 审计 + 故障排查 + 质量分析的数据基础。
**范围**：
- Trace 列表（分页 / 按 logId 搜索 / 按 agent 过滤 / 按时间）
- Trace 详情：root span + children 树
- Span 详情：input / output / duration / token usage / error
- LLM call 可视化（input messages + output + tool calls）
- 按 agent / session 过滤
**归属**：C 组
**依赖**：P3 Tracing 的采集层

### M5. Gallery（模板市场）
**本质**：已发布的 agent 作为模板供其他 workspace clone。
**范围**：
- 按 BU / 职能分类
- 预览（persona + 能力 + 示例会话）
- Clone 到用户 workspace
- 模板的更新追踪（原 agent 升级后，clone 出的是否同步）
**归属**：C 组
**依赖**：W1 workspace clone 能力

### M6. BU 级治理
**本质**：跨 BU 的全局视图（给顶层 admin 用）。
**范围**：BU 列表、BU 成员管理、BU 预算配置、BU 间权限隔离。
**归属**：C 组

---

## 六、横向 / 平台级

> 这一层的东西不归属任何一组，而是三组都依赖的共用能力。大部分需要跟 Mira 基建组协同。

### P1. 沙箱执行环境
**本质**：每个 workspace 一个独立执行容器，是所有 agent 执行能力的底座。
**范围**：文件系统隔离 / Bash / Python 执行 / 进程生命周期 / 网络权限 / 资源配额。
**归属**：Mira 基建组（等压测完接入）
**影响**：A/W6、B/C7 都依赖

### P2. Auth / SSO
**本质**：统一身份层 —— workspace 归谁、agent 谁能用、管理面谁能进。
**范围**：字节内部 SSO / 用户身份 / BU 权限映射 / workspace & agent ACL / API key 鉴权。
**归属**：Mira 基建组
**影响**：W1 归属、M0 身份映射、所有权限检查

### P3. Tracing 基础设施
**本质**：每个 agent turn 自动 trace —— 管理面 Dashboard 和 Traces 的数据源。
**范围**：Trace 自动采集 / Span 聚合（LLM call / tool call / subagent call）/ Trace 存储 / → Dashboard 的聚合查询。
**归属**：Mira 基建组（采集）+ C 组（聚合查询 + 展示）
**影响**：M1、M4

### P4. CLI 能力
**本质**：命令行接口 —— 启动 / 管理 workspace / 远程操作。
**范围**：
- `unispace` 命令（启动 / 切换项目 / clone / onboard）
- **CLI 作为 agent tool** —— agent 可以通过一个 tool 调用 CLI，创建新 workspace / 加 skill
- CLI 创建的 workspace 带上 creator 标识
**归属**：跨组
**优先级**：P1（会议明确说"这再说"）
**连接到**：P5

### P5. 平台自身 = Agent Factory
**本质**：会议里最有野心的一条 —— **平台本身要能通过自己的控制面造出新 agent**。用户跟"平台 agent"对话，平台通过 CLI tool 创建 workspace + 装配出新 agent。
**范围**：
- 平台 agent 有自己的 persona + skills + commands（把管理 agent 的能力打包成 skill）
- 用户 ↔ 平台 agent 对话 → 调 CLI tool → 创建新 workspace
- 新生成的 agent 可以发布到 Gallery
**归属**：等 A+B 完成后启动，需要 A+B 联合
**优先级**：P1（会议明确说先做控制面）

### P6. 内部共建流程
**本质**：让其他 BU 团队可以在 Mira 上面写自己的功能。不是真开源，是内部协作。
**范围**：
- 代码合到主仓库
- 设计由核心团队 review
- 其他团队作为需求方 + 实现者混合角色
- PR-level review + design review
**归属**：项目管理层

---

## 七、跨组字段对齐清单

> **并行开发的先决条件**。三组在设计阶段必须一起把这张表拍死。A 组第一期写的字段，B/C 组后续要能无缝接手，不需要任何数据迁移。

| 字段 | A 组 · Workspace 语义 | B 组 · 控制面语义 | C 组 · 管理面语义 |
|---|---|---|---|
| `id` | workspace id | 同 | agent id = workspace id |
| `name` / `description` | workspace 名称 | 同 | agent 展示名 |
| `bu` | 归属 BU | 同 | 过滤 key |
| `author` | creator 用户 id | 同 | 同 |
| `status` | A 组永远是 `draft` | 只读 | Review 流程驱动状态机 |
| `model` | 预留默认模型字段 | C10 编辑 | M2 Persona tab 编辑 |
| `system_prompt` (CLAUDE.md) | 空文件占位 | C9 编辑 | M2 Persona tab 编辑 |
| `skills[]` | 预留空数组 | C5 CRUD | M2 Capabilities tab 嵌入 |
| `subagents[]` | 预留空数组 | C6 CRUD | M2 Capabilities tab 嵌入 |
| `commands[]` | 预留空数组 | C4 CRUD | M2 Capabilities tab 嵌入 |
| `datasources[]` | 预留空数组 | C2 CRUD | 管理面只读可见 |
| `connectors[]` | 预留空数组 | C3 CRUD | M2 Environment tab 只读可见 |
| `tasks[]` | 预留空数组 | C7 CRUD | 管理面只读可见 |
| `dispatch` | 预留空对象 | C8 配置 | M2 Dispatch tab 绑定 |
| `api` | 预留空对象 | 不暴露 | M2 Publish tab 管理 |
| `environment` (mounts/runtimes/env_vars/network) | 预留空对象 | C10 部分 | M2 Workspace + Environment tab |
| `created_at` / `updated_at` | 标准时间戳 | 同 | 同 |

**原则**：任何字段的增删都要三组同步。

---

## 八、第一期范围建议

> 按会议精神，三组**并行**，第一期目标是拿出一个 workspace → 控制面 → 管理面首尾打通的最小完整形态，让用户可以"新建 workspace → 塞文件 → 装 skill → 设置触发器 → 发布给 BU 里其他人用 → 管理员看到指标"。

### 第一期必做（P0）

**A 组 · 文件夹**：
- W1 Workspace 生命周期（含完整字段预留）
- W2 文件收集（含 `.url` 外链和 loader 路由）
- W3 Session ↔ Workspace 绑定
- W4 对话拖拽（基础：file / skill / command）
- W5 三栏外壳
- W6 沙箱接入（等 Mira 基建就绪）

**B 组 · 控制面**：
- C0 控制面外壳
- C1 Files
- C4 Commands
- C5 Skills 基础（不含市场）
- C6 Subagents 基础（不含权限 UI）
- C7 Tasks 基础（含三种 trigger 的 UI 呈现，至少 manual 真能跑）
- C9 Persona
- C10 Model Settings 基础
- C2 Datasource 基础（先做 demo 模式 + 1 种真 handler）
- C3 Connectors 基础（先做 demo 模式 + 1 种真 handler）
- C8 Dispatch 飞书（其他 type 延后）

**C 组 · 管理面**：
- M0 BU 上下文（接 Mira SSO）
- M1 Dashboard 指标卡（至少 deployed agents 数 + top agents 表）
- M2 Agents 列表 + 详情 5 个核心 tab（Persona / Capabilities / Publish / Playground / Dispatch）
- M3 Review 动作（不含历史审计）
- M4 Traces 列表 + 详情 + span 详情

**横向**：
- P1 沙箱接入（跟 Mira 基建组沟通）
- P2 SSO 接入
- P3 Tracing 采集层 + 基础聚合

### 第一期不做（P1 / 后续）

- C2/C3 的多 type 真 handler（只保留 demo 形态）
- C5 Skill 市场
- C6 Subagent 独立权限 UI
- C7 Fixed cron 真实调度器 + Model-scheduled sentinel 捕获
- C8 Dispatch 的 Slack / webhook / Email inbound
- C10 Permission mode / Env vars / Tool 权限 UI
- M2 Workspace tab / Environment tab / Users tab
- M3 审核历史审计日志
- M4 按 agent 过滤 / LLM call 可视化
- M5 Gallery 全部
- M6 BU 级治理
- P4 CLI tool 化
- P5 Agent Factory

---

## 九、会议里记下来的关键决策

> 避免以后来回对齐，记在这里。

1. **数据结构对齐是并行前提**：A 组第一期就要预留所有 agent 字段（见第七节）。
2. **文件夹 + 控制面可以并行**：前提是设计阶段字段拍齐。
3. **C 组实现可能外包**：设计由核心团队把控，实现可能给其他团队（需求方和实现方分离）。
4. **`.url` 文件是 W2 的灵魂**：非本地文件统一落成 `.url`，agent 读的时候自动按类型走 loader。
5. **Session ↔ Workspace 的绑定必须显式**：W3 的字段层要变更。
6. **MCP upload 目的地要改**：不再直接传 tors，而是传到 workspace 的沙箱目录。
7. **平台 = Agent Factory 是长期目标**：P5 不在第一期，但控制面的设计要确保将来能被"平台 agent"消费。
8. **Mira 既有的 manager agents 不能另起炉灶**：C 组要跟它对齐 / 合并，不能重做一套。
9. **沙箱未全网上线**：Mira 目前在压测沙箱，第一期节奏依赖基建组。
10. **内部定位**：不对外，所有使用都算 DAU。不做给 mirror 外部用户的通用产品。

---
