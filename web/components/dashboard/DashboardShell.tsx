"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * Renders a dashboard layout shell with a toggleable sidebar, topbar, and main content area.
 *
 * This React component provides the structural layout for a dashboard interface. It manages sidebar visibility state for mobile/responsive views, including an overlay that closes the sidebar when clicked. The layout consists of three main sections: a collapsible sidebar, a topbar with user initials and menu toggle, and a main scrollable content area where children components are rendered.
 *
 * @param {React.ReactNode} children - The content to be rendered in the main content area of the dashboard.
 * @param {string} userInitials - The user's initials to be displayed in the topbar component.
 * @returns {JSX.Element} A React element containing the complete dashboard layout structure with sidebar, topbar, and main content area.
 * @example
 * <DashboardShell userInitials="JS">
 *   <YourDashboardContent />
 * </DashboardShell>
 */
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
