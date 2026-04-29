import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initials = user?.first_name?.slice(0, 1) ?? user?.email?.slice(0, 1) ?? "U";

  return (
    <DashboardShell userInitials={initials}>
      {children}
    </DashboardShell>
  );
}
