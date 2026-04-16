import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore, type FileTab } from "../store";

// ═══════════════════════════════════════════════════════════════
//  DispatchArtifactEditor — opens in the Artifacts panel when
//  a user clicks a dispatch entry or "+ Add dispatch".
//
//  Two modes per spec:
//    1. Mira main bot routing — select this project as target
//    2. User's own Feishu bot — provide app credentials
// ═══════════════════════════════════════════════════════════════

type DispatchMode = "mira_bot" | "custom_bot";

interface DispatchData {
  id: string;
  mode: DispatchMode;
  enabled: boolean;
  bot_name: string;
  app_id: string;
  app_secret: string;
  welcome_message: string;
}

const EMPTY: DispatchData = {
  id: "",
  mode: "mira_bot",
  enabled: true,
  bot_name: "",
  app_id: "",
  app_secret: "",
  welcome_message: "",
};

export default function DispatchArtifactEditor({
  tab,
  controlsSlot,
}: {
  tab: FileTab;
  controlsSlot: HTMLElement | null;
}) {
  const { serverUrl, closeFile } = useStore();
  const initial: DispatchData = tab.content ? { ...EMPTY, ...JSON.parse(tab.content) } : EMPTY;
  const isNew = tab.path === "__dispatch__/__new__";

  const [data, setData] = useState<DispatchData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = tab.content ? { ...EMPTY, ...JSON.parse(tab.content) } : EMPTY;
    setData(d);
  }, [tab.path]);

  const patch = (p: Partial<DispatchData>) => setData((d) => ({ ...d, ...p }));

  async function handleSave() {
    setSaving(true);
    try {
      // Save dispatch config to project channels
      await fetch(`${serverUrl}/api/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [data.id || "feishu"]: { enabled: data.enabled, appId: data.app_id, appSecret: data.app_secret } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      if (isNew) closeFile(tab.path);
    } catch (e) {
      console.error("Save dispatch failed:", e);
    }
    setSaving(false);
  }

  return (
    <>
      {controlsSlot &&
        createPortal(
          <div className="flex items-center gap-1.5">
            {saved && <span className="text-[11px] text-[#788c5d]">Saved</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[#141413] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#2a2a28] disabled:opacity-40"
            >
              {saving ? "Saving\u2026" : "Save"}
            </button>
          </div>,
          controlsSlot,
        )}

      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-lg space-y-5">
          {/* Mode selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#6b6963]">Dispatch Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => patch({ mode: "mira_bot" })}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                  data.mode === "mira_bot"
                    ? "border-[#141413] bg-[#141413] text-white"
                    : "border-[#e8e6dc] text-[#6b6963] hover:border-[#b0aea5]"
                }`}
              >
                <div className="font-medium">Mira Main Bot</div>
                <div className={`mt-0.5 text-[10px] ${data.mode === "mira_bot" ? "text-white/70" : "text-[#b0aea5]"}`}>
                  Route messages from platform bot to this project
                </div>
              </button>
              <button
                onClick={() => patch({ mode: "custom_bot" })}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                  data.mode === "custom_bot"
                    ? "border-[#141413] bg-[#141413] text-white"
                    : "border-[#e8e6dc] text-[#6b6963] hover:border-[#b0aea5]"
                }`}
              >
                <div className="font-medium">Custom Feishu Bot</div>
                <div className={`mt-0.5 text-[10px] ${data.mode === "custom_bot" ? "text-white/70" : "text-[#b0aea5]"}`}>
                  Connect your own bot credentials
                </div>
              </button>
            </div>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[#e8e6dc] px-3 py-2.5">
            <span className="text-xs text-[#141413]">Enabled</span>
            <button
              onClick={() => patch({ enabled: !data.enabled })}
              className={`relative h-5 w-9 rounded-full transition ${data.enabled ? "bg-[#788c5d]" : "bg-[#e8e6dc]"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${data.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Custom bot fields */}
          {data.mode === "custom_bot" && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#6b6963]">Bot Name</label>
                <input
                  type="text"
                  value={data.bot_name}
                  onChange={(e) => patch({ bot_name: e.target.value })}
                  placeholder="My Finance Bot"
                  className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-sm text-[#141413] outline-none transition focus:border-[#141413]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#6b6963]">App ID</label>
                <input
                  type="text"
                  value={data.app_id}
                  onChange={(e) => patch({ app_id: e.target.value })}
                  placeholder="cli_xxxxxxxxxx"
                  className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-sm text-[#141413] outline-none transition focus:border-[#141413]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#6b6963]">App Secret</label>
                <input
                  type="password"
                  value={data.app_secret}
                  onChange={(e) => patch({ app_secret: e.target.value })}
                  placeholder="********************"
                  className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-sm text-[#141413] outline-none transition focus:border-[#141413]"
                />
              </div>
            </>
          )}

          {/* Welcome message */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6b6963]">Welcome Message</label>
            <textarea
              value={data.welcome_message}
              onChange={(e) => patch({ welcome_message: e.target.value })}
              rows={3}
              placeholder="Hi! I'm your assistant. How can I help?"
              className="w-full resize-none rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-sm text-[#141413] outline-none transition focus:border-[#141413]"
            />
          </div>

          {/* Mira bot info */}
          {data.mode === "mira_bot" && (
            <div className="rounded-lg border border-[#6a9bcc]/20 bg-[#6a9bcc]/5 px-4 py-3">
              <p className="text-xs text-[#6a9bcc]">
                Messages sent to the Mira platform bot will be routed to this project's agent.
                No additional credentials needed.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
