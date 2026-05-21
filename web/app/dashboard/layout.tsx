import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/user";

/**
 * Renders the dashboard layout by fetching the current user and deriving their initials for display.
 *
 * An async Next.js layout component that retrieves the authenticated user via `getCurrentUser()`, computes a single-character initial from the user's first name or email (falling back to 'U' if neither is available), and wraps the provided child components inside a `DashboardShell` with the computed initials.
 *
 * @param {React.ReactNode} children - The child React nodes to be rendered inside the DashboardShell layout.
 * @returns {Promise<JSX.Element>} A Promise that resolves to a JSX element representing the DashboardShell wrapping the provided children.
 * @example
 * // Used as a Next.js layout in app/dashboard/layout.tsx
 * export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
 *   return <DashboardLayout>{children}</DashboardLayout>;
 * }
 */




export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initials = user?.first_name?.slice(0, 1) ?? user?.email?.slice(0, 1) ?? "U";

  return (
    <DashboardShell userInitials={initials}>
      {children}
    </DashboardShell>
  );
}
