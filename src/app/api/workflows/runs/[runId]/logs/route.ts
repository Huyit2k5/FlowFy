import { NextResponse, type NextRequest } from "next/server";
import { getRunLogs } from "@/lib/workflow-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const logs = await getRunLogs(runId);
  return NextResponse.json({ logs });
}