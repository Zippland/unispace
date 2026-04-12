import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import DashboardPage from "./pages/DashboardPage";
import TracesPage from "./pages/TracesPage";
import AgentsPage from "./pages/AgentsPage";
import AgentDetailPage from "./pages/AgentDetailPage";
import ReviewsPage from "./pages/ReviewsPage";

export default function AdminApp() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#faf9f5] text-[#141413]">
        <AdminSidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/agents" element={<AgentsPage />} />
            <Route path="/admin/agents/:id" element={<AgentDetailPage />} />
            <Route path="/admin/reviews" element={<ReviewsPage />} />
            <Route path="/admin/traces" element={<TracesPage />} />
            <Route path="/admin/traces/:logid" element={<TracesPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
