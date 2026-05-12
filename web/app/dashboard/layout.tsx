import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/user";

/**
 * Renders the dashboard layout component by fetching the current user and extracting their initials to pass to the DashboardShell wrapper.
 *
 * This async server component retrieves the authenticated user's data and computes their initials from either their first name or email address. The initials are then passed as a prop to the DashboardShell component which wraps the provided children. This layout is typically used as a Next.js app directory layout component for dashboard routes.
 *
 * @param {React.ReactNode} children - The child components to be rendered within the DashboardShell layout.
 * @returns {Promise<JSX.Element>} A promise that resolves to a JSX element containing the DashboardShell component with the provided children and computed user initials.
 * @example
 * <DashboardLayout><YourDashboardContent /></DashboardLayout>
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
