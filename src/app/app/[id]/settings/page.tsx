import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getCurrentWorkspace(id);
  if (!ws) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
      <p className="mt-1 text-sm text-zinc-600">Cài đặt cho workspace {ws.name}.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Thông tin</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Tên</dt>
              <dd className="font-medium">{ws.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Gói hiện tại</dt>
              <dd className="font-medium capitalize">{ws.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Vai trò của bạn</dt>
              <dd className="font-medium capitalize">{ws.role}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Tích hợp</h2>
          <p className="mt-3 text-sm text-zinc-500">
            Cấu hình webhook, Slack, email và Notion sẽ được thêm ở Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
}