import { useState, useEffect } from "react";
import { useStore } from "../store";

// ═══════════════════════════════════════════════════════════════
//  ConfigDialog (config.json)
// ═══════════════════════════════════════════════════════════════

interface ConfigData {
  model: { provider: string; name: string; apiKey: string; baseUrl: string; temperature: number; maxTokens: number };
  server: { port: number; workDir: string };
}

export function ConfigDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { serverUrl } = useStore();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      fetch(`${serverUrl}/api/config`).then((r) => r.json()).then(setConfig).catch(() => {});
      setSaved(false);
    }
  }, [open, serverUrl]);

  if (!open) return null;

  function update(section: "model" | "server", key: string, value: string | number) {
    if (!config) return;
    setConfig({ ...config, [section]: { ...config[section], [key]: value } });
    setSaved(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await fetch(`${serverUrl}/api/config`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
        <div className="flex items-center justify-between border-b border-[#e8e6dc] px-6 py-4">
          <div className="flex items-center gap-2">
            <GearSvg />
            <h2 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">config.json</h2>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        {!config ? (
          <div className="px-6 py-12 text-center text-[13px] text-[#b0aea5]">Loading...</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-5">
            <Section title="Model">
              <Field label="Provider" value={config.model.provider} onChange={(v) => update("model", "provider", v)} />
              <Field label="Model name" value={config.model.name} onChange={(v) => update("model", "name", v)} />
              <Field label="API Key" value={config.model.apiKey} type="password" onChange={(v) => update("model", "apiKey", v)} />
              <Field label="Base URL" value={config.model.baseUrl} onChange={(v) => update("model", "baseUrl", v)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Temperature" value={String(config.model.temperature)} onChange={(v) => update("model", "temperature", parseFloat(v) || 0)} />
                <Field label="Max tokens" value={String(config.model.maxTokens)} onChange={(v) => update("model", "maxTokens", parseInt(v) || 0)} />
              </div>
            </Section>
            <Section title="Server">
              <Field label="Port" value={String(config.server.port)} onChange={(v) => update("server", "port", parseInt(v) || 3210)} />
              <Field label="Working directory" value={config.server.workDir} placeholder="Default: ~/.unispace/" onChange={(v) => update("server", "workDir", v)} />
            </Section>
          </div>
        )}
        <Footer hint={saved ? "Saved! Restart server to apply." : "Changes saved to config.json"} saving={saving} onClose={onClose} onSave={handleSave} />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SoulDialog (SOUL.md)
// ═══════════════════════════════════════════════════════════════

export function SoulDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { serverUrl } = useStore();
  const [soul, setSoul] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      fetch(`${serverUrl}/api/files/read?path=SOUL.md`).then((r) => r.text()).then(setSoul).catch(() => setSoul(""));
      setSaved(false);
    }
  }, [open, serverUrl]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${serverUrl}/api/files/write`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: "SOUL.md", content: soul }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
        <div className="flex items-center justify-between border-b border-[#e8e6dc] px-6 py-4">
          <div className="flex items-center gap-2">
            <DocSvg />
            <h2 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">SOUL.md</h2>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="px-6 py-5">
          <p className="text-[12px] text-[#b0aea5] mb-3">
            Custom personality and behavior instructions. The agent reads this at the start of every conversation.
          </p>
          <textarea
            value={soul}
            onChange={(e) => { setSoul(e.target.value); setSaved(false); }}
            rows={14}
            spellCheck={false}
            className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-4 py-3 font-mono text-[12px] leading-5 text-[#141413] outline-none transition focus:border-[#b0aea5] resize-y"
          />
        </div>
        <Footer hint={saved ? "Saved!" : "Changes saved to SOUL.md"} saving={saving} onClose={onClose} onSave={handleSave} />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Shared pieces
// ═══════════════════════════════════════════════════════════════

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-6 w-6 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#141413] hover:bg-[#141413]/[0.04]">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function Footer({ hint, saving, onClose, onSave }: { hint: string; saving: boolean; onClose: () => void; onSave: () => void }) {
  return (
    <div className="flex items-center justify-between border-t border-[#e8e6dc] px-6 py-4">
      <span className="text-[11px] text-[#b0aea5]">{hint}</span>
      <div className="flex gap-2">
        <button onClick={onClose} className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[13px] text-[#6b6963] transition hover:bg-[#faf9f5]">Close</button>
        <button onClick={onSave} disabled={saving} className="rounded-lg bg-[#141413] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-['Poppins',_Arial,_sans-serif] text-[11px] font-semibold uppercase tracking-widest text-[#b0aea5] mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, type = "text", placeholder, onChange }: { label: string; value: string; type?: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[12px] text-[#6b6963] mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none transition focus:border-[#b0aea5] placeholder:text-[#b0aea5]" />
    </div>
  );
}

function GearSvg() {
  return (
    <svg className="h-4 w-4 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function DocSvg() {
  return (
    <svg className="h-4 w-4 text-[#6a9bcc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6V7.5Z" />
    </svg>
  );
}
