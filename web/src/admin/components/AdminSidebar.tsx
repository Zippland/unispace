import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAdminContext } from "../stores/adminContext";

export default function AdminSidebar() {
  const user = useAdminContext((s) => s.user);
  const bus = useAdminContext((s) => s.bus);
  const activeBu = useAdminContext((s) => s.activeBu);
  const setActiveBu = useAdminContext((s) => s.setActiveBu);
  const [buOpen, setBuOpen] = useState(false);

  const currentBu = bus.find((b) => b.key === activeBu) || bus[0];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
      isActive
        ? "bg-[#d97757]/10 text-[#d97757] font-medium"
        : "text-[#141413]/70 hover:bg-[#e8e6dc]/50 hover:text-[#141413]"
    }`;

  return (
    <aside className="flex w-56 flex-col border-r border-[#e8e6dc] bg-[#faf9f5]">
      {/* Brand */}
      <div className="border-b border-[#e8e6dc] px-5 py-4">
        <h1 className="text-lg font-semibold text-[#141413]">
          Mira Project
        </h1>
        <p className="mt-0.5 text-xs text-[#141413]/50">Agent Management</p>
      </div>

      {/* BU switcher */}
      <div className="relative border-b border-[#e8e6dc] px-3 py-3">
        <button
          onClick={() => setBuOpen(!buOpen)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#e8e6dc]/50"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
            style={{ background: BU_COLORS[activeBu] || "#b0aea5" }}
          >
            {currentBu.label.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#141413]">
              {currentBu.label}
            </p>
            <p className="text-[10px] text-[#b0aea5]">{currentBu.role}</p>
          </div>
          <svg
            className={`h-3 w-3 shrink-0 text-[#b0aea5] transition-transform ${buOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {buOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setBuOpen(false)} />
            <div className="absolute left-3 right-3 top-full z-40 mt-1 rounded-lg border border-[#e8e6dc] bg-white py-1 shadow-[0_8px_24px_rgba(20,20,19,0.08)]">
              {bus.map((bu) => (
                <button
                  key={bu.key}
                  onClick={() => {
                    setActiveBu(bu.key);
                    setBuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[#faf9f5] ${
                    bu.key === activeBu ? "bg-[#faf9f5] font-medium text-[#141413]" : "text-[#6b6963]"
                  }`}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                    style={{ background: BU_COLORS[bu.key] || "#b0aea5" }}
                  >
                    {bu.label.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1">{bu.label}</span>
                  <span className="text-[10px] text-[#b0aea5]">{bu.role}</span>
                  {bu.key === activeBu && (
                    <svg className="h-3 w-3 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <NavLink to="/admin/dashboard" className={linkClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink to="/admin/agents" className={linkClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          Agents
        </NavLink>

        <NavLink to="/admin/reviews" className={linkClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
          </svg>
          Reviews
          <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#d97757] text-[10px] font-medium text-white">
            3
          </span>
        </NavLink>

        <NavLink to="/admin/traces" className={linkClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
          Traces
        </NavLink>
      </nav>

      {/* User chip */}
      <div className="border-t border-[#e8e6dc] px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#141413] text-[10px] font-bold text-[#faf9f5]">
            {user.avatar_initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#141413]">{user.name}</p>
            <p className="truncate text-[10px] text-[#b0aea5]">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

const BU_COLORS: Record<string, string> = {
  finance: "#d97757",
  hr: "#788c5d",
  engineering: "#6a9bcc",
  marketing: "#b0aea5",
};
