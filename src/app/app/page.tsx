import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ws } = await supabase
    .from("members")
    .select("workspaces (id)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  const first = ws?.[0]?.workspaces as { id: string } | null | undefined;

  if (first) redirect(`/app/${first.id}`);
  redirect("/onboarding");
}