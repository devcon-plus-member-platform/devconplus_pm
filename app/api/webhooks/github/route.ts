import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase";

function verifySignature(secret: string, body: string, signature: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const event = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const body = await request.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoFullName = (payload.repository as { full_name?: string } | undefined)?.full_name;
  if (!repoFullName) return NextResponse.json({ error: "No repository in payload" }, { status: 400 });

  const service = createServiceRoleClient();

  const { data: connection } = await service
    .from("github_connections")
    .select("id, webhook_secret")
    .eq("repo_full_name", repoFullName)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No connection found for this repository" }, { status: 404 });
  }

  // Verify HMAC signature if provided
  if (signature && !verifySignature((connection as { webhook_secret: string }).webhook_secret, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only handle pull_request and push events
  if (!event || !["pull_request", "push"].includes(event)) {
    return NextResponse.json({ ok: true, message: "Event not tracked" });
  }

  const eventData: Record<string, unknown> = {
    connection_id: (connection as { id: string }).id,
    event_type: event,
    repo_full_name: repoFullName,
    merged: false,
  };

  if (event === "pull_request") {
    const action = payload.action as string;
    const trackedActions = ["opened", "closed", "reopened", "review_requested", "ready_for_review"];
    if (!trackedActions.includes(action)) {
      return NextResponse.json({ ok: true, message: "PR action not tracked" });
    }

    const pr = payload.pull_request as Record<string, unknown>;
    const isMerged = action === "closed" && (pr.merged as boolean);

    eventData.action = isMerged ? "merged" : action;
    eventData.pr_number = pr.number as number;
    eventData.pr_title = pr.title as string;
    eventData.pr_url = pr.html_url as string;
    eventData.pr_state = pr.state as string;
    eventData.merged = isMerged;
    eventData.author_login = (pr.user as { login?: string } | undefined)?.login ?? null;
    eventData.author_avatar_url = (pr.user as { avatar_url?: string } | undefined)?.avatar_url ?? null;
    eventData.branch_from = (pr.head as { ref?: string } | undefined)?.ref ?? null;
    eventData.branch_to = (pr.base as { ref?: string } | undefined)?.ref ?? null;
  } else if (event === "push") {
    const ref = payload.ref as string | undefined;
    const pusher = payload.pusher as { name?: string } | undefined;
    const headCommit = payload.head_commit as { message?: string } | undefined;

    eventData.action = null;
    eventData.branch_to = ref?.replace("refs/heads/", "") ?? null;
    eventData.author_login = pusher?.name ?? null;
    eventData.pr_title = headCommit?.message?.split("\n")[0] ?? null;
    eventData.pr_url = (payload.compare as string) ?? null;
  }

  await service.from("github_events").insert(eventData);

  return NextResponse.json({ ok: true });
}
