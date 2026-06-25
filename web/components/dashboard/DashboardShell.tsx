"use client";

import { useEffect, useState } from "react";
import { setUserId } from "@/lib/ga";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * Renders the main dashboard layout shell with a toggleable sidebar, mobile overlay, topbar, and scrollable content area.
 *
 * DashboardShell is a React layout component that manages the top-level structure of the dashboard UI. It maintains local state for sidebar open/close toggling, renders a mobile overlay that dismisses the sidebar on click, and composes a Topbar and Sidebar with appropriate callbacks. All page content is rendered inside a scrollable main element.
 *
 * @param {React.ReactNode} children - The page content to render inside the scrollable main content area of the dashboard.
 * @param {string} userInitials - The user's initials string passed to the Topbar component, typically displayed in an avatar or profile badge.
 * @returns {JSX.Element} A React element representing the full dashboard shell layout including sidebar, overlay, topbar, and main content area.
 * @example
 * <DashboardShell userInitials="JS">
 *   <h1>Welcome to the Dashboard</h1>
 *   <p>Your analytics overview goes here.</p>
 * </DashboardShell>
 */



export default function DashboardShell({
  children,
  userInitials,
  userId,
}: {
  children: React.ReactNode;
  userInitials: string;
  userId?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (userId) setUserId(userId);
  }, [userId]);

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
        <main style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 28px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
