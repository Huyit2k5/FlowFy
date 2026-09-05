import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/onboarding-form";

export default async function Onboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Nếu đã có workspace -> vào app
  const { data: existing } = await supabase
    .from("members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  const wsId = (existing?.[0] as { workspace_id: string } | undefined)?.workspace_id;
  if (wsId) redirect(`/app/${wsId}`);

  return (
    <div className="flex min-h-full items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light text-lg font-bold text-white">
            F
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Tạo workspace đầu tiên
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Workspace là nơi đội ngũ của bạn cùng làm việc. Đặt tên cho
            công ty hoặc nhóm của bạn.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}