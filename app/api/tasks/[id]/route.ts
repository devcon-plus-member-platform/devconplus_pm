import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const service = createServiceRoleClient();
    const { error } = await service
      .from("tasks")
      .update(body)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tasks PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
