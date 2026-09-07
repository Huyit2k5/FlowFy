import { redirect } from "next/navigation";
import { getWorkspaces } from "@/lib/workspaces";
import { check2faStatus } from "@/lib/two-factor";
import AppShell from "@/components/app-shell";
import { TwoFactorGate } from "@/components/two-factor-gate";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { id } = await params;
  const workspaces = await getWorkspaces();

  if (!workspaces.length) redirect("/onboarding");

  const current = workspaces.find((w) => w.id === id) ?? workspaces[0];

  // Enterprise: 2FA enforcement
  const twoFactor = await check2faStatus(id);

  return (
    <AppShell workspaces={workspaces} current={current}>
      {twoFactor.enforced && !twoFactor.allowed ? (
        <TwoFactorGate />
      ) : (
        children
      )}
    </AppShell>
  );
}
