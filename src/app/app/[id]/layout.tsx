import { redirect } from "next/navigation";
import { getWorkspaces } from "@/lib/workspaces";
import AppShell from "@/components/app-shell";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { id } = await params;
  const workspaces = await getWorkspaces();

  if (!workspaces.length) redirect("/onboarding");

  const current = workspaces.find((w) => w.id === id) ?? workspaces[0];

  return (
    <AppShell workspaces={workspaces} current={current}>
      {children}
    </AppShell>
  );
}