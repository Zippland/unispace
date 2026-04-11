import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
//  MiraDemo — static visual prototype of Mira's welcome surface.
//  No backend, no real state beyond a little input echo. This is
//  here so we can look at the shell alongside UniSpace's Project
//  mode and decide how the two should cross over.
// ═══════════════════════════════════════════════════════════════

type Mode = "new_chat" | "task" | "customize";

interface RecentSession {
  id: string;
  title: string;
  project?: string;
}

// Demo data lifted from the Mira reference screenshot
const RECENTS: RecentSession[] = [
  { id: "1", title: "周报总结优化版" },
  { id: "2", title: "Weekly Report", project: "finance" },
  { id: "3", title: "doc 编辑能力" },
  { id: "4", title: "PDF 生成流程" },
  { id: "5", title: "Skill 部署渠道" },
  { id: "6", title: "MCP 使用推荐场景" },
  { id: "7", title: "importer CLI 配置说明", project: "importer" },
  { id: "8", title: "字节 SSO 域名注册" },
  { id: "9", title: "字节 SSO 登录流程" },
  { id: "10", title: "MCP 开发框架说明" },
  { id: "11", title: "importer CLI 配置生成", project: "importer" },
  { id: "12", title: "环境复盘 v1.2 使用" },
  { id: "13", title: "CI 部署手册 SMCP 使用" },
  { id: "14", title: "CIS 部署条件 MCP 风险评估" },
  { id: "15", title: "小说家风格演进" },
  { id: "16", title: "Prompt 写作实用技巧" },
  { id: "17", title: "我的项目进程整体" },
  { id: "18", title: "我的方法新规则优化" },
];

const ACTION_CHIPS: { label: string; emoji: string }[] = [
  { label: "Deep Research", emoji: "🔬" },
  { label: "Excel Analysis", emoji: "📊" },
  { label: "Docx Drafter", emoji: "📝" },
  { label: "Slide Writer", emoji: "📑" },
  { label: "Translate", emoji: "🌐" },
  { label: "Cowork", emoji: "🤝" },
];

const TEMPLATE_TABS = [
  "Explore",
  "Research",
  "Product",
  "Design",
  "HR",
  "DA",
  "Finance",
  "PMO",
  "Legal",
];

interface Template {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  uses: number;
  gradient: string;
}

const TEMPLATES: Template[] = [
  {
    id: "1",
    title: "产品需求探究",
    subtitle: "Product Research",
    author: "Mira Team",
    uses: 1283,
    gradient: "from-[#f0e9dc] to-[#e8dcc4]",
  },
  {
    id: "2",
    title: "文化演绎能力 · 绘画大师",
    subtitle: "Cultural Interpretation",
    author: "Mira Team",
    uses: 842,
    gradient: "from-[#e6d9ce] to-[#d6c5b3]",
  },
  {
    id: "3",
    title: "行业简报",
    subtitle: "Industry Briefing",
    author: "Community",
    uses: 3210,
    gradient: "from-[#ded2c4] to-[#c8b89e]",
  },
  {
    id: "4",
    title: "学生报告与数据课程解读",
    subtitle: "Academic Report",
    author: "Mira Team",
    uses: 567,
    gradient: "from-[#e0d6cb] to-[#c9b7a3]",
  },
  {
    id: "5",
    title: "Clean Expression",
    subtitle: "精准表达助手",
    author: "Mira Team",
    uses: 2104,
    gradient: "from-[#e8e0d4] to-[#d0c3b2]",
  },
  {
    id: "6",
    title: "Marketing Strategy",
    subtitle: "营销策略设计",
    author: "Community",
    uses: 1847,
    gradient: "from-[#ead9c4] to-[#d4bc9c]",
  },
  {
    id: "7",
    title: "Code Review Buddy",
    subtitle: "代码审查助手",
    author: "Mira Team",
    uses: 3421,
    gradient: "from-[#d4cdc0] to-[#b5ab97]",
  },
  {
    id: "8",
    title: "Weekly Review",
    subtitle: "周度复盘",
    author: "Community",
    uses: 912,
    gradient: "from-[#e6ddcf] to-[#c9b79c]",
  },
];

export default function MiraDemo() {
  const [mode, setMode] = useState<Mode>("new_chat");
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("Explore");

  return (
    <div className="flex h-screen bg-[#faf9f5] text-[#141413] font-sans">
      <MiraSidebar mode={mode} onModeChange={setMode} />

      {/* Main area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="relative flex min-h-full flex-col">
          {/* Security policy badge (top-right) */}
          <div className="absolute right-6 top-6">
            <button className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white/70 px-3 py-1.5 text-[11px] text-[#6b6963] backdrop-blur hover:border-[#b0aea5]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7c9a5e]" />
              View security policy
            </button>
          </div>

          <div className="mx-auto w-full max-w-4xl px-10 pb-16 pt-20">
            {/* Hero */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#141413] text-[28px]">
                🐱
              </div>
              <h1 className="font-['Poppins',_Arial,_sans-serif] text-[34px] font-semibold tracking-tight text-[#141413]">
                What's on your mind?
              </h1>
              <p className="mt-2 text-[14px] text-[#6b6963]">
                Trusted AI Work Platform for Every ByteDancer
              </p>
            </div>

            {/* Prompt box */}
            <div className="rounded-[22px] border border-[#e8e6dc] bg-white px-5 pb-3 pt-5 shadow-[0_4px_20px_rgba(20,20,19,0.04)]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                placeholder={`Ask anything, use "/" to select a skill or "@" to reference a resource`}
                className="w-full resize-none border-0 bg-transparent text-[14px] leading-6 text-[#141413] outline-none placeholder:text-[#b0aea5]"
              />
              <div className="flex items-center gap-2 pt-2">
                {/* Model pill */}
                <button className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-3 py-1 text-[11px] text-[#141413] transition hover:border-[#b0aea5]">
                  <span className="text-[#d97757]">◆</span>
                  <span className="font-medium">Gemini 3.1 Pro</span>
                  <svg className="h-2.5 w-2.5 text-[#b0aea5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {/* Small icon buttons */}
                <IconBtn title="Knowledge">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </IconBtn>
                <IconBtn title="Attach">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </IconBtn>
                <IconBtn title="Resource">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </IconBtn>

                <div className="flex-1" />

                <button className="flex h-7 w-7 items-center justify-center rounded-full text-[#b0aea5] transition hover:bg-[#faf9f5] hover:text-[#141413]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b0aea5]/50 text-white transition hover:bg-[#141413]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Action chip row */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {ACTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-3.5 py-1.5 text-[12px] text-[#141413] transition hover:border-[#b0aea5] hover:bg-[#faf9f5]"
                >
                  <span className="text-[13px]">{chip.emoji}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Template section */}
            <div className="mt-12">
              {/* Tab row */}
              <div className="mb-5 flex items-center gap-5 border-b border-[#e8e6dc] pb-0">
                {TEMPLATE_TABS.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative pb-3 text-[13px] font-medium transition ${
                        isActive
                          ? "text-[#141413]"
                          : "text-[#b0aea5] hover:text-[#6b6963]"
                      }`}
                    >
                      {tab}
                      {isActive && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#141413]" />
                      )}
                    </button>
                  );
                })}
                <div className="ml-auto pb-3">
                  <button className="text-[13px] font-medium text-[#b0aea5] hover:text-[#141413]">
                    My Templates
                  </button>
                </div>
              </div>

              {/* Template grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {TEMPLATES.map((t) => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────

function MiraSidebar({
  mode,
  onModeChange,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-[#e8e6dc] bg-white/60">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141413] text-[14px]">
            🐱
          </div>
          <span className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
            Mira
          </span>
        </div>
        <button className="flex h-6 w-6 items-center justify-center rounded text-[#b0aea5] hover:text-[#141413]">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      </div>

      {/* Primary mode buttons */}
      <nav className="mt-5 flex flex-col px-3">
        <ModeButton
          active={mode === "new_chat"}
          onClick={() => onModeChange("new_chat")}
          label="New Chat"
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            </svg>
          }
        />
        <ModeButton
          active={mode === "task"}
          onClick={() => onModeChange("task")}
          label="Task"
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <ModeButton
          active={mode === "customize"}
          onClick={() => onModeChange("customize")}
          label="Customize"
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          }
        />
      </nav>

      {/* Recents */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
        <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
          Recents
        </div>
        <div className="flex-1 overflow-y-auto">
          {RECENTS.map((s) => (
            <button
              key={s.id}
              className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-[#6b6963] transition hover:bg-[#141413]/[0.04] hover:text-[#141413]"
            >
              <span
                className="h-3 w-[3px] shrink-0 rounded-full"
                style={{ background: s.project ? colorFor(s.project) : "#e8e6dc" }}
                title={s.project || "global"}
              />
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User */}
      <div className="flex items-center gap-2 border-t border-[#e8e6dc] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d97757] text-[11px] font-semibold text-white">
          Z
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-[12px] font-medium text-[#141413]">
            Zylan Jian
          </div>
          <div className="truncate text-[10px] text-[#b0aea5]">Mira user</div>
        </div>
      </div>
    </aside>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition ${
        active
          ? "bg-[#141413]/[0.05] text-[#141413] font-medium"
          : "text-[#6b6963] hover:bg-[#141413]/[0.03] hover:text-[#141413]"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center ${
          active ? "text-[#d97757]" : "text-[#b0aea5]"
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

// ── Template card ─────────────────────────────────────────────

function TemplateCard({ template }: { template: Template }) {
  return (
    <button className="group flex flex-col overflow-hidden rounded-2xl border border-[#e8e6dc] bg-white text-left transition hover:border-[#b0aea5] hover:shadow-[0_8px_24px_rgba(20,20,19,0.06)]">
      <div className={`aspect-[4/3] w-full bg-gradient-to-br ${template.gradient}`}>
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg bg-white/60 px-3 py-1.5 text-[11px] font-medium text-[#141413] backdrop-blur">
            {template.subtitle}
          </div>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="truncate text-[13px] font-medium text-[#141413]">
          {template.title}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#b0aea5]">
          <span>{template.author}</span>
          <span>·</span>
          <span>{template.uses.toLocaleString()} uses</span>
        </div>
      </div>
    </button>
  );
}

// ── Icon button helper ───────────────────────────────────────

function IconBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e8e6dc] text-[#6b6963] transition hover:border-[#b0aea5] hover:text-[#141413]"
    >
      {children}
    </button>
  );
}

// ── Hash a string → stable HSL color ─────────────────────────
//  Used to give each project a reproducible tag color without
//  a config table.

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 50%, 60%)`;
}
