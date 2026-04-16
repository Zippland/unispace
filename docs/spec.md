# Mira · Catwork 产品规约

> **事实源**。改产品规则先改本文档再改代码。
>
> 完整产品愿景见 [features.md](./features.md)。

---

## §0 规则

开发前必读。违反任何一条视为 bug。

| # | 规则 |
|---|------|
| R1 | **Catwork = Project = Workspace = Agent**。四个名字指同一概念，一个实体，不拆表。 |
| R2 | **Session 绑定 Catwork，不可迁移**。创建时写入归属，此后不变。 |
| R3 | **Catwork 单人归属，无共享**。创建者即所有者，无成员列表，无协作。 |
| R4 | **Agent 无状态机**。没有 draft / live / deprecated 流转。创建即可用。 |
| R5 | **无 review / 审核词汇**。产品里不存在审批流程。 |
| R6 | **无 subagents**。callable_agents 暂不支持。 |
| R7 | **BU 是治理，不是权限**。BU admin 可 trace，不可编辑用户的 Catwork。 |
| R8 | **Datasource 和 Connector 互不引用**。同一外部系统可同时作为 datasource（读）和 connector（写），但两者在模型层独立。 |
| R9 | **无 sandbox / 运行环境配置**。Environment 自动创建，UI 不暴露 runtimes / network / mounts / env vars 等设置。Default files 除外（可以配置）。 |
| R10 | **改规则先改本文档**。spec.md 是唯一事实源。 |

---

## §1 术语

| 术语 | 定义 |
|------|------|
| **Catwork** | 用户的工作容器，同时也是 agent 本身。包含对话、文件、所有装配能力。一个 Catwork = 一个 agent |
| **Session** | Catwork 内的一次对话。无状态，不持有文件 |
| **Datasource** | 外部数据源的统一入口。底层异构（cli / mcp / skill / session 四种来源），表面同构 |
| **Connector** | 外部动作通道 = MCP server。agent 通过它调用外部服务 |
| **Task** | prompt + trigger 的触发单元。所有触发 agent 的路径统一到 Task 抽象 |
| **Skill** | 给 agent 的可复用操作手册 / runbook |
| **Dispatch** | 入站消息通道。让外部（飞书 bot / webhook）可以触发 agent |
| **Persona** | Agent 的 system prompt。定义"我是谁、我的原则" |
| **Environment** | Agent 运行环境。自动创建默认实例，用户不感知 |
| **Template** | 可 clone 的 Catwork 快照。BU admin 发布，用户 clone 后成为自己的 Catwork |
| **BU** | 业务单元。治理归属：trace 可见性 / 模板发布渠道 / 预算归属 |
| **Default Mira Catwork** | 外壳的默认 Catwork。用户首次进入时自动创建，不感知 Catwork 概念 |
| **Gallery** | Template 的市场。用户从这里 clone，BU admin 从这里发布 |

---

## §2 概念关系

### Catwork

- 一个 Catwork 就是一个 agent，不是"容器指向 agent"的两层结构
- 归属单个用户（创建者 = 所有者）。不跨用户共享
- 来源两种：**自建**（不属于任何 BU）或**从 Template clone**（归属源 BU）
- 用户无法手动修改 BU 归属 —— 由 clone 路径决定
- 每个 Catwork 有独立的沙箱（文件系统 + 执行环境）

### Session 与 Catwork

- 每个 Session 归属且仅归属一个 Catwork，创建时绑定，不可变更
- 同一 Catwork 下所有 Session 共享 workspace（文件目录）。Session 是无状态的纯对话
- 跨 Catwork 知识传递：把 session 记录挂载为目标 Catwork 的一个 Datasource，agent 可 refer 但不继承原 session 的工具链路
- 文件归属 Catwork，不归属 Session。Session 里的附件只存引用（URL），不复制文件

### Template 版本模型

- 同一 Template 系列（family）下有多个版本，老版本不删除
- 每个 family 有且仅有一个"最新版"标记，Gallery 只展示最新版
- BU admin 发新版 = 新增一条记录 + 翻转最新版标记。不可编辑已发布的版本
- 用户 clone Template = 新建一个 Catwork + 装配字段来自 Template 快照 + 记录来源版本
- 升级 = 用新版快照覆盖当前装配字段。用户本地修改会被覆盖。文件和对话历史不动

### Datasource 四源模型

Datasource 不是一个独立的物理存储，而是一个聚合视图。产品层把四种不同来源的资源统一呈现为"数据源"卡片：

| 来源 | 说明 |
|------|------|
| **cli** | 命令行工具（如风神 CLI） |
| **mcp** | MCP server 条目（与 Connector 共用物理存储，归属语义不同） |
| **skill** | Skill 文件（与 Skill 共用物理存储） |
| **session** | 其他 Catwork 的对话记录挂载 |

用户不关心底层形态，只看到统一的 datasource 列表。编辑时路由到对应的底层入口。

---

## §3 Catwork 生命周期

### 创建

两种入口：
- **从零新建** —— 空白 Catwork，不属于任何 BU
- **从 Template clone** —— 装配字段来自 Template 快照，归属源 BU

### 默认 Mira Catwork

用户首次进入 Mira 时自动创建一个默认 Catwork。用户在"外面"的所有对话都发生在这里。界面呈现和现在一样，底层有了 Catwork 归属。

### 删除

删除 Catwork = 删除全部内容（文件 + 对话 + 配置）。不可恢复。

### 从 Template 升级

- 触发条件：用户的 Catwork 来源版本 < Template 最新版本
- 用户手动点升级 → 新版快照覆盖当前装配字段
- 文件和对话历史不动。用户本地修改会被覆盖（当前策略，明确告知用户）

---

## §4 Session

1. **绑定**：创建时写入所属 Catwork，此后不可变更
2. **共享 workspace**：同一 Catwork 内所有 Session 共享文件目录。Session 本身不持有文件
3. **不可迁移**：Session 与 Catwork 的 persona / skills / tools 强绑定，上下文不连续，迁移有损
4. **跨 Catwork 知识传递**：把 session 记录挂载为目标 Catwork 的 Datasource。agent 可读取但不继承工具链路
5. **文件引用**：附件存的是文件 URL。同用户跨 Catwork 可通过 URL 打开自己的文件（权限走用户），但 agent 主动读写只限本 Catwork 沙箱

---

## §5 装配维度

Catwork 作为 agent 可被装配的 8 个维度。用户渐进式发现。

**打包模型**：每个 Catwork Template 的本质 = **YAML（配置）+ Files（上传文件）**。所有非文件的配置（persona / model / tasks / connectors / dispatch 等）都用 YAML 承载；所有文件类资产（skills 压缩包、default files）以上传方式存在。Template 分发 = 打包 YAML + files。

### Files

用户上传的文件 + agent 生成的中间文件。agent 可直接读写。拖进 chat 可作为显性上下文。管理面配置 default files 时以文件上传方式添加（不是在文本框里手写内容）。

### Datasource

外部数据源的统一入口。表面同构（统一卡片列表），底层异构（cli / mcp / skill / session 四种来源）。拖进 chat 可让 agent 查询。Datasource 是聚合视图，不持有独立数据。

### Connector

外部动作通道 = MCP server。agent 通过 Connector 调用外部服务（Slack / GitHub / 飞书通知等）。安装 Connector = 注册一个 MCP server。敏感字段（token / secret）不进 agent 视野。

### Task

所有触发 agent 的路径统一到 Task。三种 trigger：
- **manual** —— 用户 `/name args` 或 Run now
- **fixed** —— cron 定时执行
- **model** —— 模型自决下次唤醒时间

Task 本质是预设的 prompt + trigger + 可选的预设上下文。`/name` 是人调 agent 的快捷方式。Template 可以预置 manual task 作为引导项。

### Skill

给 agent 的可复用操作手册。描述"如何做 X"，含文档、代码、辅助资源文件。一个 Skill 是一个目录（不是单个 .md），安装时以压缩包上传。Mira runtime 原生加载。

### Dispatch

入站消息通道。让 agent 可以通过飞书 bot 被外部触发。每个 Catwork 独立配置，两种模式：
- **Mira 主 bot 路由** — 使用平台的主 bot，设定路由规则将消息转发到该 Catwork
- **用户自有 bot** — 用户连接自己的飞书 bot（可多个），直接绑定到该 Catwork

外部消息进来 → 按 bot 绑定关系找到目标 Catwork → 查找或创建 Session → agent 回复 → 反向推送。

### Persona

Agent 的 system prompt。定义"我是谁、我的原则、我的上下文"。保存后下次对话立即生效。映射到 Mira API 的 `Agent.system` 字段。

### Model

选择 agent 使用的模型。每个 Catwork 独立配置。

---

## §6 管理面

### BU Admin 的 3 件事

1. **提供模板** —— 在本 BU 的 Gallery 发布 / 更新 Template
2. **Trace & Debug** —— 观察本 BU 下用户怎么用 Template（对话 / trace / 错误）
3. **发新版本** —— 发现改进空间时发布新版，用户手动升级

BU admin **不能**：编辑用户 Catwork / 修改已发布 Template / 跨 BU 查看

### 权限矩阵

| 角色 | 可 trace 范围 | 可编辑 |
|------|-------------|--------|
| 普通用户 | 自己的所有 Catwork | 自己的 Catwork |
| BU admin | 本 BU 下所有用户 Catwork（只读） | 无 |
| Mira 超级 admin | 全量（含个人 Catwork） | 无 |

### Template 生命周期

1. **发布**：BU admin 把自己的 Catwork 导出为 Template 新版本
2. **Clone**：用户从 Gallery 选 Template → 新 Catwork（归属源 BU，记录来源版本）
3. **发新版**：新增版本记录（老版本保留），翻转"最新版"标记
4. **升级**：用户端检测到新版本 → 手动升级 → 覆盖装配字段（文件 / 对话不动）
5. **下架**：标记 deprecated，老 clone 继续运行，新 clone 禁止

### Trace 可见性

- 每次 agent 对话自动产生 trace（调用链路树）
- 普通用户看自己的 trace
- BU admin 看本 BU 下所有 trace（跨用户聚合）
- Mira 超级 admin 看全量 trace

---

## §7 变更日志

| 日期 | 变更 |
|------|------|
| 2026-04-16 | 初版。从 features.md 提炼业务逻辑创建。 |
