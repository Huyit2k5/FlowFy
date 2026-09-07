import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PUT: bật/tắt schedule cho workflow.
 * Body: { cron: "0 9 * * 1-5", enabled: true/false }
 * Uses Vercel Cron (no BullMQ/Redis needed).
 */

function nextOccurrence(cron: string, from: Date): Date {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return new Date(from.getTime() + 3600_000);
  const [min, hour, , , dow] = parts;
  const result = new Date(from);
  result.setSeconds(0, 0);

  if (min === "*" && hour === "*") {
    result.setMinutes(result.getMinutes() + 1);
    return result;
  }
  if (hour === "*") {
    result.setMinutes(parseInt(min, 10) || 0);
    result.setHours(result.getHours() + 1);
    return result;
  }
  result.setMinutes(parseInt(min, 10) || 0);
  result.setHours(parseInt(hour, 10) || 0);
  if (dow !== "*") {
    const days: number[] = [];
    for (const p of dow.split(",")) {
      if (p.includes("-")) {
        const [a, b] = p.split("-").map(Number);
        for (let d = a; d <= b; d++) days.push(d);
      } else {
        days.push(parseInt(p, 10));
      }
    }
    let add = 0;
    while (!days.includes(result.getDay()) && add < 8) {
      add++;
      result.setDate(result.getDate() + 1);
    }
  }
  if (result <= from) result.setDate(result.getDate() + 1);
  return result;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { cron, enabled } = body as { cron?: string; enabled?: boolean };

  const { data: wf } = await supabase
    .from("workflows")
    .select("id, workspace_id, trigger_type")
    .eq("id", id)
    .maybeSingle();

  if (!wf) {
    return NextResponse.json({ error: "Không tìm thấy workflow" }, { status: 404 });
  }

  const workflow = wf as {
    id: string;
    workspace_id: string;
    trigger_type: string;
  };

  // Tắt schedule
  if (enabled === false) {
    await supabase
      .from("workflows")
      .update({ schedule: null, schedule_enabled: false, next_run_at: null })
      .eq("id", id);

    return NextResponse.json({ ok: true, message: "Đã tắt lịch chạy" });
  }

  // Bật schedule
  if (!cron) {
    return NextResponse.json({ error: "Cần cron expression" }, { status: 400 });
  }

  const nextRun = nextOccurrence(cron, new Date());

  await supabase
    .from("workflows")
    .update({
      schedule: cron,
      schedule_enabled: true,
      trigger_type: "schedule",
      next_run_at: nextRun.toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    message: "Đã bật lịch chạy",
    next_run: nextRun.toISOString(),
  });
}