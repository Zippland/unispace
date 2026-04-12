import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
      isActive
        ? "bg-[#d97757]/10 text-[#d97757] font-medium"
        : "text-[#141413]/70 hover:bg-[#e8e6dc]/50 hover:text-[#141413]"
    }`;

  return (
    <aside className="flex w-56 flex-col border-r border-[#e8e6dc] bg-[#faf9f5]">
      <div className="border-b border-[#e8e6dc] px-5 py-4">
        <h1
          className="text-lg font-semibold text-[#141413]"
        >
          Mira Project
        </h1>
        <p className="mt-0.5 text-xs text-[#141413]/50">Agent Management</p>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <NavLink to="/admin/agents" className={linkClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          Agents
        </NavLink>

        <NavLink to="/admin/traces" className={linkClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
          Traces
        </NavLink>
      </nav>
    </aside>
  );
}
