"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardShell({
  children,
  userInitials,
}: {
  children: React.ReactNode;
  userInitials: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dash-layout">
      {/* Mobile overlay */}
      <div
        className={`dash-overlay${sidebarOpen ? " is-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`dash-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="dash-content">
        <Topbar
          userInitials={userInitials}
          onMenuClick={() => setSidebarOpen(o => !o)}
        />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
