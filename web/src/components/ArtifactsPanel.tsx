import { useRef } from "react";
import { useStore } from "../store";
import FileViewer from "./FileViewer";
import TaskArtifactEditor from "./TaskArtifactEditor";

// ═══════════════════════════════════════════════════════════════
//  ArtifactsPanel — right-side file preview that replaces the
//  settings cards when a file tab is active.
//
//  Tab bar + FileViewer. Closing the last tab returns to cards.
// ═══════════════════════════════════════════════════════════════

export default function ArtifactsPanel() {
  const { openTabs, activeTab, setActiveTab, closeFile } = useStore();
  const controlsRef = useRef<HTMLDivElement>(null);

  const currentTab = openTabs.find((t) => t.path === activeTab);

  return (
    <div className="flex w-[400px] shrink-0 flex-col">
      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0.5 border-b border-[rgba(41,41,31,0.08)] bg-[#fafaf7] px-2 pt-2">
        {openTabs.map((t) => {
          const isActive = t.path === activeTab;
          return (
            <div
              key={t.path}
              className={`group flex max-w-[160px] items-center gap-1 rounded-t-lg px-2.5 py-1.5 text-[12px] transition ${
                isActive
                  ? "bg-white text-[#29291f]"
                  : "text-[#9f9c93] hover:bg-white/50 hover:text-[#6a685d]"
              }`}
            >
              <button
                onClick={() => setActiveTab(t.path)}
                className="min-w-0 flex-1 truncate text-left"
                title={t.path}
              >
                {t.name}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); closeFile(t.path); }}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#b0aea5] opacity-0 transition group-hover:opacity-100 hover:text-[#29291f]"
                title="Close"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Back to cards button */}
        <button
          onClick={() => setActiveTab(null)}
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#9f9c93] hover:bg-[rgba(41,41,31,0.06)] hover:text-[#29291f]"
          title="Back to cards"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </svg>
        </button>

        {/* Controls slot for FileViewer (save button, mode toggle) */}
        <div ref={controlsRef} className="flex items-center" />
      </div>

      {/* ── File content ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {currentTab ? (
          currentTab.type === "task" ? (
            <TaskArtifactEditor tab={currentTab} controlsSlot={controlsRef.current} />
          ) : (
            <FileViewer tab={currentTab} controlsSlot={controlsRef.current} />
          )
        ) : (
          <div className="flex flex-1 items-center justify-center text-[12px] text-[#b0aea5]">
            No file selected
          </div>
        )}
      </div>
    </div>
  );
}
