import { useEffect, useState, useCallback, useRef } from "react";
import { useStore } from "./store";
import * as api from "./api";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import FileViewer from "./components/FileViewer";
import SettingsDialog from "./components/SettingsDialog";
import DevPanel from "./components/DevPanel";

const SYSTEM_FILES = new Set(["config.json", "SOUL.md"]);
const IS_DEV = import.meta.env.VITE_DEV_MODE === "true";

// ── Helpers ───────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function usePersistentWidth(key: string, initial: number) {
  const [w, setW] = useState(() => {
    const s = localStorage.getItem(key);
    return s ? parseInt(s) : initial;
  });
  const set = useCallback(
    (fn: (prev: number) => number) =>
      setW((prev) => {
        const next = fn(prev);
        localStorage.setItem(key, String(next));
        return next;
      }),
    [key],
  );
  return [w, set] as const;
}

// ── Resize handle ─────────────────────────────────────────────

function ResizeHandle({ onResize }: { onResize: (dx: number) => void }) {
  const dragging = useRef(false);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    let lastX = e.clientX;

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      onResize(dx);
    }
    function onUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div
      className="w-[5px] shrink-0 cursor-col-resize relative group"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-y-0 left-[2px] w-px bg-[#e8e6dc] group-hover:bg-[#b0aea5] group-hover:w-[2px] group-hover:left-[1.5px] transition-all" />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  const {
    connected,
    serverUrl,
    openTabs,
    activeTab,
    setConnection,
    setSessions,
    setFiles,
    openFile,
    closeFile,
    setActiveTab,
    setFileContent,
  } = useStore();

  const [urlInput, setUrlInput] = useState(serverUrl);
  const [checking, setChecking] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const [sidebarW, setSidebarW] = usePersistentWidth("us:sidebar", 240);
  const [chatW, setChatW] = usePersistentWidth("us:chat", 360);

  useEffect(() => {
    tryConnect(serverUrl);
  }, []);

  async function tryConnect(url: string) {
    setChecking(true);
    try {
      const data = await api.checkHealth(url);
      setConnection(true, url, data.workDir);
      const [sessions, files] = await Promise.all([
        api.fetchSessions(url),
        api.fetchFiles(url),
      ]);
      setSessions(sessions);
      setFiles(files);
    } catch {
      setConnection(false);
    }
    setChecking(false);
  }

  const {
    setActiveSession, setActiveTab: setActiveTabStore,
    messages: storeMessages, setSessionMessages,
  } = useStore();

  const handleOpenFile = useCallback(
    async (path: string, name: string) => {
      // System files → open GUI settings
      if (SYSTEM_FILES.has(name)) {
        setSettingsOpen(true);
        return;
      }

      // Session files → switch to that session's chat
      if (path.startsWith("sessions/") && path.endsWith(".jsonl")) {
        const sessionId = path.replace("sessions/", "").replace(".jsonl", "");
        setActiveSession(sessionId);
        setActiveTabStore(null); // switch to chat
        if (!storeMessages[sessionId] || storeMessages[sessionId].length === 0) {
          try {
            const raw = await api.fetchSessionMessages(serverUrl, sessionId);
            if (raw.length > 0) {
              setSessionMessages(sessionId, api.convertRawMessages(raw));
            }
          } catch {}
        }
        return;
      }

      openFile(path, name);
      const ext = name.split(".").pop()?.toLowerCase() || "";
      if (
        ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"].includes(
          ext,
        )
      )
        return;
      try {
        const content = await api.fetchFileContent(serverUrl, path);
        setFileContent(path, content);
      } catch (e) {
        setFileContent(path, `Error: ${e}`);
      }
    },
    [serverUrl, openFile, setFileContent],
  );

  // ── Connection screen ─────────────────────────────────────

  if (!connected) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#faf9f5]">
        <div className="bg-white border border-[#e8e6dc] rounded-2xl p-8 max-w-md w-full mx-4 shadow-sm">
          <h1 className="text-xl font-semibold text-[#141413] mb-1">
            UniSpace
          </h1>
          <p className="text-[#b0aea5] text-sm mb-6">
            {checking
              ? "Searching for local agent..."
              : "Connect to your local agent"}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:3210"
              className="flex-1 border border-[#e8e6dc] rounded-lg px-3 py-2 text-sm text-[#141413] focus:outline-none focus:border-[#141413] bg-[#faf9f5]"
            />
            <button
              onClick={() => tryConnect(urlInput)}
              disabled={checking}
              className="bg-[#141413] text-white hover:bg-[#2a2a28] disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
            >
              {checking ? "..." : "Connect"}
            </button>
          </div>
          {!checking && (
            <p className="text-red-500 text-xs mt-3">
              Could not connect. Make sure the server is running.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Workspace layout ──────────────────────────────────────

  const activeFileTab = openTabs.find((t) => t.path === activeTab);
  const hasTabs = openTabs.length > 0;

  return (
    <div className="h-screen flex bg-[#faf9f5] text-[#141413]">
      {/* Sidebar */}
      <div style={{ width: sidebarW }} className="shrink-0 h-full">
        <Sidebar onOpenFile={handleOpenFile} />
      </div>

      {/* Handle: sidebar edge */}
      <ResizeHandle
        onResize={(dx) => setSidebarW((w) => clamp(w + dx, 180, 400))}
      />

      {hasTabs ? (
        <>
          {/* Preview: fills remaining space */}
          <div className="flex-1 flex flex-col min-w-[200px] h-full">
            {/* Tab bar */}
            <div className="flex border-b border-[#e8e6dc] bg-[#f0efe9] shrink-0 overflow-x-auto">
              {openTabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => setActiveTab(tab.path)}
                  className={`group flex items-center gap-1.5 px-3 py-2 text-[13px] border-r border-[#e8e6dc] shrink-0 ${
                    activeTab === tab.path
                      ? "bg-[#faf9f5] text-[#141413]"
                      : "text-[#b0aea5] hover:text-[#6b6963] hover:bg-[#f5f4f0]"
                  }`}
                >
                  <span className="truncate max-w-[140px]">{tab.name}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFile(tab.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-[11px] ml-0.5 leading-none"
                  >
                    x
                  </span>
                </button>
              ))}
            </div>

            {activeFileTab ? (
              <FileViewer tab={activeFileTab} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#b0aea5] text-sm">
                Select a tab
              </div>
            )}
          </div>

          {/* Handle: preview ↔ chat */}
          <ResizeHandle
            onResize={(dx) => setChatW((w) => clamp(w - dx, 280, 700))}
          />

          {/* Chat: fixed width */}
          <div
            style={{ width: chatW }}
            className="shrink-0 flex flex-col h-full"
          >
            <ChatPanel />
          </div>
        </>
      ) : (
        /* No preview: chat fills all remaining space */
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <ChatPanel />
        </div>
      )}

      {/* Dev panel (right edge, only in dev mode) */}
      {IS_DEV && devOpen && (
        <>
          <ResizeHandle onResize={() => {}} />
          <div className="w-[420px] shrink-0 h-full">
            <DevPanel />
          </div>
        </>
      )}

      {/* Dev toggle button (bottom-right corner) */}
      {IS_DEV && (
        <button
          onClick={() => setDevOpen(!devOpen)}
          className={`fixed bottom-4 right-4 z-40 flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium shadow-md transition ${
            devOpen
              ? "bg-[#d97757] text-white"
              : "bg-white text-[#d97757] border border-[#e8e6dc]"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          DEV
        </button>
      )}

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
