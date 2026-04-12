import { create } from "zustand";

// ── Mock identity & BU scope ────────────────────────────────
// Demo-only. In production this comes from SSO / RBAC.

export interface BuInfo {
  key: string;
  label: string;
  role: "admin" | "editor" | "viewer";
}

export interface UserInfo {
  name: string;
  email: string;
  avatar_initials: string;
}

const MOCK_USER: UserInfo = {
  name: "Zhang Ming",
  email: "zhangming@bytedance.com",
  avatar_initials: "ZM",
};

const MOCK_BUS: BuInfo[] = [
  { key: "finance", label: "Finance", role: "admin" },
  { key: "hr", label: "HR", role: "admin" },
  { key: "engineering", label: "Engineering", role: "editor" },
  { key: "marketing", label: "Marketing", role: "viewer" },
];

interface AdminContextState {
  user: UserInfo;
  bus: BuInfo[];
  activeBu: string;
  setActiveBu: (bu: string) => void;
  /** Current BU's info */
  currentBu: () => BuInfo;
}

export const useAdminContext = create<AdminContextState>((set, get) => ({
  user: MOCK_USER,
  bus: MOCK_BUS,
  activeBu: MOCK_BUS[0].key,
  setActiveBu: (bu) => set({ activeBu: bu }),
  currentBu: () => {
    const { bus, activeBu } = get();
    return bus.find((b) => b.key === activeBu) || bus[0];
  },
}));
