import { getCurrentSession } from "@/server/actions/auth-actions";
import { redirect } from "next/navigation";
import SidebarContainer from "@/components/providers/sidebar-container";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/auth/sign-in");
  }
  if (!session?.user.businessId) {
    redirect("/onboarding");
  }
  return <SidebarContainer>{children}</SidebarContainer>;
}
