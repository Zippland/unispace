import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
//  ProjectTasksPanel — UniSpace's project-scoped task view.
//
//  Rendered inside CustomizePanel's "Tasks" sub-page. The outer
//  CustomizePanel provides the page header ("Tasks" + subtitle),
//  so this component starts directly with its content — no h1.
//
//  Kept deliberately separate from Mira's global TaskPanel even
//  though they look similar today. The two surfaces have different
//  semantics (global = cross-project automations; project = tasks
//  scoped to this project's files / skills / personas) and will
//  diverge in vocabulary, data source, and available actions.
// ═══════════════════════════════════════════════════════════════

interface TaskCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

// Static placeholder tasks shown on the project Tasks sub-page.
// Real project task infrastructure is not wired up yet; these cards
// illustrate the intended shape and will be replaced when the
// backend gains a task runner.
const PROJECT_TASKS: TaskCard[] = [
  {
    id: "weekly-report",
    icon: "📝",
    title: "Weekly Report Auto-Draft",
    description: "Generate a weekly status report from session history.",
  },
  {
    id: "file-digest",
    icon: "🔍",
    title: "File Change Digest",
    description: "Summarize new and modified files since yesterday.",
  },
  {
    id: "todo-reminder",
    icon: "✅",
    title: "Daily TODO Reminder",
    description: "Check project todos and ping uncompleted ones.",
  },
];

export default function ProjectTasksPanel() {
  const [activeTab, setActiveTab] = useState<"Today" | "All">("Today");
  const [showToast, setShowToast] = useState(false);

  function handleNewTask() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-5xl px-10 pb-16 pt-6">
        {/* Task cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PROJECT_TASKS.map((task) => (
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
        </div>

        {/* Empty state + "+ New task" */}
        <div className="mt-16 flex flex-col items-center">
          <div className="text-[28px]">⏰</div>
          <div className="mt-2 text-[14px] font-medium text-[#141413]">
            Create your first project task
          </div>
          <div className="mt-1 text-[12px] text-[#b0aea5]">
            Tasks run against this project's files, skills, and personas.
          </div>
          <button
            onClick={handleNewTask}
            className="mt-5 flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-4 py-2 text-[13px] text-[#141413] transition hover:border-[#b0aea5]"
          >
            <svg
              className="h-3.5 w-3.5 text-[#6b6963]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New task
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-[#141413] px-4 py-2 text-[12px] text-white shadow-lg">
          Project task creation is coming soon.
        </div>
      )}
    </div>
  );
}
