import { NextResponse, type NextRequest } from "next/server";
import { listWorkflowRuns } from "@/lib/workflow-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runs = await listWorkflowRuns(id, 30);
  return NextResponse.json({ runs });
}