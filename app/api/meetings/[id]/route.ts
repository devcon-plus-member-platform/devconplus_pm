import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { updateCalendarEvent, cancelCalendarEvent } from "@/lib/google-calendar";
import { sendMeetingCancellationEmail } from "@/lib/resend";
import type { Contributor, Meeting } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH — update meeting
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const supabase = createServiceRoleClient();

    const { data: existing } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single<Meeting>();

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 });
    }

    // Sync with Google Calendar if event ID exists
    if (existing.google_calendar_event_id) {
      try {
        await updateCalendarEvent({
          googleEventId: existing.google_calendar_event_id,
          title: body.title,
          description: body.description,
          meetingDate: body.meeting_date,
          startTime: body.start_time,
          endTime: body.end_time,
          timezone: body.timezone,
          attendeeEmails: body.attendee_emails,
        });
      } catch (calErr) {
        console.warn("[PATCH meetings] Google Calendar update failed:", calErr);
      }
    }

    const { attendee_ids, ...meetingUpdates } = body;

    const { data: updated } = await supabase
      .from("meetings")
      .update(meetingUpdates)
      .eq("id", id)
      .select("*")
      .single();

    // Sync attendees if provided
    if (attendee_ids) {
      await supabase.from("meeting_attendees").delete().eq("meeting_id", id);
      if (attendee_ids.length > 0) {
        await supabase.from("meeting_attendees").insert(
          (attendee_ids as string[]).map((cid) => ({ meeting_id: id, contributor_id: cid }))
        );
      }
    }

    return NextResponse.json({ ok: true, meeting: updated });
  } catch (err) {
    console.error("[PATCH /api/meetings/[id]]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE — cancel meeting
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServiceRoleClient();

    const { data: meeting } = await supabase
      .from("meetings")
      .select("*, attendees:meeting_attendees(contributor:contributors(email,full_name))")
      .eq("id", id)
      .single<Meeting & { attendees: Array<{ contributor: Contributor }> }>();

    if (!meeting) {
      return NextResponse.json({ ok: false, error: "Meeting not found" }, { status: 404 });
    }

    // Cancel in Google Calendar
    if (meeting.google_calendar_event_id) {
      try {
        await cancelCalendarEvent(meeting.google_calendar_event_id);
      } catch (calErr) {
        console.warn("[DELETE meetings] Google Calendar cancel failed:", calErr);
      }
    }

    // Set status = Cancelled (don't hard delete)
    await supabase.from("meetings").update({ status: "Cancelled" }).eq("id", id);

    // Send backup cancellation emails
    const attendees = (meeting as unknown as { attendees: Array<{ contributor: Contributor }> }).attendees ?? [];
    await Promise.allSettled(
      attendees
        .filter((a) => a.contributor?.email)
        .map((a) =>
          sendMeetingCancellationEmail({
            to: a.contributor.email,
            recipientName: a.contributor.full_name ?? a.contributor.email,
            title: meeting.title,
            meetingDate: meeting.meeting_date,
            startTime: meeting.start_time.slice(0, 5),
          })
        )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/meetings/[id]]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
