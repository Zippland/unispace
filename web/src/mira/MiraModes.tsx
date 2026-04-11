import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
//  MiraModes — Mira's main-area content for each non-project mode.
//    • MiraWelcomeMain      — New Chat mode landing page
//    • TaskPanel            — Task mode landing page (global scope)
//    • GlobalCustomizePanel — Customize mode placeholder
//
//  All pages are demo-only (static data) — they replicate Mira's
//  external look for the review environment. Real product value
//  lives inside Project mode (UniSpace's own surfaces).
//
//  Sidebar scaffold (brand, mode buttons, user chip, Recents) is in
//  MiraChrome.tsx.
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  New Chat mode — main area
// ═══════════════════════════════════════════════════════════════

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

interface ChatTemplate {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  uses: number;
  gradient: string;
}

const CHAT_TEMPLATES: ChatTemplate[] = [
  { id: "1", title: "产品需求探究", subtitle: "Product Research", author: "Mira Team", uses: 1283, gradient: "from-[#f0e9dc] to-[#e8dcc4]" },
  { id: "2", title: "文化演绎能力 · 绘画大师", subtitle: "Cultural Interpretation", author: "Mira Team", uses: 842, gradient: "from-[#e6d9ce] to-[#d6c5b3]" },
  { id: "3", title: "行业简报", subtitle: "Industry Briefing", author: "Community", uses: 3210, gradient: "from-[#ded2c4] to-[#c8b89e]" },
  { id: "4", title: "学生报告与数据课程解读", subtitle: "Academic Report", author: "Mira Team", uses: 567, gradient: "from-[#e0d6cb] to-[#c9b7a3]" },
  { id: "5", title: "Clean Expression", subtitle: "精准表达助手", author: "Mira Team", uses: 2104, gradient: "from-[#e8e0d4] to-[#d0c3b2]" },
  { id: "6", title: "Marketing Strategy", subtitle: "营销策略设计", author: "Community", uses: 1847, gradient: "from-[#ead9c4] to-[#d4bc9c]" },
  { id: "7", title: "Code Review Buddy", subtitle: "代码审查助手", author: "Mira Team", uses: 3421, gradient: "from-[#d4cdc0] to-[#b5ab97]" },
  { id: "8", title: "Weekly Review", subtitle: "周度复盘", author: "Community", uses: 912, gradient: "from-[#e6ddcf] to-[#c9b79c]" },
];

export function MiraWelcomeMain() {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("Explore");

  return (
    <div className="relative flex min-h-full flex-col overflow-y-auto">
      {/* Top-right security policy chip */}
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
            <button className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-3 py-1 text-[11px] text-[#141413] transition hover:border-[#b0aea5]">
              <span className="text-[#d97757]">◆</span>
              <span className="font-medium">Claude Sonnet 4.5</span>
              <svg className="h-2.5 w-2.5 text-[#b0aea5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div className="flex-1" />
            <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b0aea5]/50 text-white transition hover:bg-[#141413]">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action chips */}
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

        {/* Templates */}
        <div className="mt-12">
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

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {CHAT_TEMPLATES.map((t) => (
              <ChatTemplateCard key={t.id} template={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatTemplateCard({ template }: { template: ChatTemplate }) {
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

// ═══════════════════════════════════════════════════════════════
//  Task mode — Mira's global Task landing page.
//
//  UniSpace's project-scoped task view lives in its own file
//  (components/ProjectTasksPanel.tsx). The two surfaces share no
//  code because they have different semantics and will diverge.
// ═══════════════════════════════════════════════════════════════

interface TaskCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const GLOBAL_TASKS: TaskCard[] = [
  {
    id: "1",
    icon: "✨",
    title: "Daily AI news",
    description: "Search and organize daily AI news from trusted sources",
  },
  {
    id: "2",
    icon: "🏢",
    title: "Super Company News",
    description: "Collect news from ByteDance, competitors, and the industry",
  },
  {
    id: "3",
    icon: "🐱",
    title: "Daily English Learning",
    description: "Learn 5 new English words every day with examples",
  },
];

export function TaskPanel() {
  const [activeTab, setActiveTab] = useState<"Today" | "All">("Today");
  const [showToast, setShowToast] = useState(false);

  function handleNewTask() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-5xl px-10 pb-16 pt-14">
        <h1 className="font-['Poppins',_Arial,_sans-serif] text-[18px] font-semibold text-[#141413]">
          Task
        </h1>

        {/* Task cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {GLOBAL_TASKS.map((task) => (
            <button
              key={task.id}
              className="group flex items-start gap-3 rounded-2xl border border-[#e8e6dc] bg-white px-5 py-4 text-left transition hover:border-[#b0aea5] hover:shadow-[0_4px_20px_rgba(20,20,19,0.04)]"
            >
              <span className="text-[22px] leading-none">{task.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[#141413]">
                  {task.title}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[11px] text-[#b0aea5]">
                  {task.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="mt-8 flex items-center gap-5 border-b border-[#e8e6dc]">
          {(["Today", "All"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-3 text-[13px] font-medium transition ${
                  isActive ? "text-[#141413]" : "text-[#b0aea5] hover:text-[#6b6963]"
                }`}
              >
                {tab}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#141413]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Empty state + "+ New task" */}
        <div className="mt-16 flex flex-col items-center">
          <div className="text-[28px]">⏰</div>
          <div className="mt-2 text-[14px] font-medium text-[#141413]">
            Let's create a new task!
          </div>
          <div className="mt-1 text-[12px] text-[#b0aea5]">
            Creating a task will automatically perform the operation
          </div>
          <button
            onClick={handleNewTask}
            className="mt-5 flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-4 py-2 text-[13px] text-[#141413] transition hover:border-[#b0aea5]"
          >
            <svg className="h-3.5 w-3.5 text-[#6b6963]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New task
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-[#141413] px-4 py-2 text-[12px] text-white shadow-lg">
          Task creation coming in Mira 2.0
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Customize mode — placeholder for the global (chat-wide) layer
// ═══════════════════════════════════════════════════════════════

export function GlobalCustomizePanel() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-10 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="text-[40px]">⚙️</div>
        <h1 className="mt-4 font-['Poppins',_Arial,_sans-serif] text-[22px] font-semibold text-[#141413]">
          Global Customize
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-[#6b6963]">
          Chat-level skills, connectors, and dispatch adapters that apply to
          every session — even the ones outside of any project.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#e8e6dc] bg-[#faf9f5] px-4 py-2 text-[11px] font-medium text-[#6b6963]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#d97757]" />
          Coming in Mira 2.0
        </div>
        <p className="mt-6 text-[11px] leading-relaxed text-[#b0aea5]">
          Project-level customization is already live — open any project and
          switch to the Customize tab inside.
        </p>
      </div>
    </div>
  );
}
