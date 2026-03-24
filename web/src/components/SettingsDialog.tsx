import { useState, useEffect } from "react";
import { useStore } from "../store";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ConfigData {
  model: {
    provider: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    temperature: number;
    maxTokens: number;
  };
  server: {
    port: number;
    workDir: string;
  };
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { serverUrl } = useStore();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [soul, setSoul] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      fetch(`${serverUrl}/api/config`)
        .then((r) => r.json())
        .then(setConfig)
        .catch(() => {});
      fetch(`${serverUrl}/api/files/read?path=SOUL.md`)
        .then((r) => r.text())
        .then(setSoul)
        .catch(() => setSoul(""));
    }
  }, [open, serverUrl]);

  if (!open) return null;

  function update(section: "model" | "server", key: string, value: string | number) {
    if (!config) return;
    setConfig({
      ...config,
      [section]: { ...config[section], [key]: value },
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await Promise.all([
        fetch(`${serverUrl}/api/config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }),
        fetch(`${serverUrl}/api/files/write`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "SOUL.md", content: soul }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save:", e);
    }
    setSaving(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e6dc] px-6 py-4">
          <h2 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#141413] hover:bg-[#141413]/[0.04]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {!config ? (
          <div className="px-6 py-12 text-center text-[13px] text-[#b0aea5]">Loading...</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-5">
            {/* Model section */}
            <Section title="Model">
              <Field label="Provider" value={config.model.provider}
                onChange={(v) => update("model", "provider", v)} />
              <Field label="Model name" value={config.model.name}
                onChange={(v) => update("model", "name", v)} />
              <Field label="API Key" value={config.model.apiKey} type="password"
                onChange={(v) => update("model", "apiKey", v)} />
              <Field label="Base URL" value={config.model.baseUrl}
                onChange={(v) => update("model", "baseUrl", v)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Temperature" value={String(config.model.temperature)}
                  onChange={(v) => update("model", "temperature", parseFloat(v) || 0)} />
                <Field label="Max tokens" value={String(config.model.maxTokens)}
                  onChange={(v) => update("model", "maxTokens", parseInt(v) || 0)} />
              </div>
            </Section>

            {/* Server section */}
            <Section title="Server">
              <Field label="Port" value={String(config.server.port)}
                onChange={(v) => update("server", "port", parseInt(v) || 3210)} />
              <Field label="Working directory" value={config.server.workDir}
                placeholder="Default: ~/.unispace/"
                onChange={(v) => update("server", "workDir", v)} />
            </Section>

            {/* SOUL.md section */}
            <Section title="SOUL.md">
              <p className="text-[12px] text-[#b0aea5] -mt-1 mb-2">
                Custom personality and behavior instructions for the agent.
              </p>
              <textarea
                value={soul}
                onChange={(e) => { setSoul(e.target.value); setSaved(false); }}
                rows={8}
                spellCheck={false}
                className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-[12px] leading-5 text-[#141413] outline-none transition focus:border-[#b0aea5] resize-y"
              />
            </Section>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#e8e6dc] px-6 py-4">
          <span className="text-[11px] text-[#b0aea5]">
            {saved ? "Saved! Restart server to apply." : "Changes saved to ~/.unispace/config.json"}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[13px] text-[#6b6963] transition hover:bg-[#faf9f5]">
              Close
            </button>
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-[#141413] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-['Poppins',_Arial,_sans-serif] text-[11px] font-semibold uppercase tracking-widest text-[#b0aea5] mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label, value, type = "text", placeholder, onChange,
}: {
  label: string; value: string; type?: string; placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[12px] text-[#6b6963] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none transition focus:border-[#b0aea5] placeholder:text-[#b0aea5]"
      />
    </div>
  );
}
