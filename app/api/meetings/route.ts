import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendMeetingConfirmationEmail } from "@/lib/resend";
import type { MeetingRecurrence, MeetingType, Contributor, Meeting } from "@/types";

interface CreateMeetingBody {
  project_id: string | null;
  title: string;
  type: MeetingType;
  description: string | null;
  meeting_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence: MeetingRecurrence;
  recurrence_end_date: string | null;
  reminder_minutes_before: number;
  attendee_ids: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMeetingBody = await request.json();

    if (!body.title || !body.meeting_date || !body.start_time || !body.end_time) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch attendee contributor records
    const { data: attendees } = await supabase
      .from("contributors")
      .select("id,email,full_name")
      .in("id", body.attendee_ids);

    const attendeeContributors = (attendees as Pick<Contributor, "id" | "email" | "full_name">[]) ?? [];
    const attendeeEmails = attendeeContributors.map((c) => c.email);

    // Create Google Calendar event
    let googleEventId: string | null = null;
    let googleMeetLink: string | null = null;

    try {
      const result = await createCalendarEvent({
        title: body.title,
        description: body.description,
        meetingDate: body.meeting_date,
        startTime: body.start_time,
        endTime: body.end_time,
        timezone: body.timezone,
        attendeeEmails,
        recurrence: body.recurrence,
        recurrenceEndDate: body.recurrence_end_date,
      });
      googleEventId = result.googleEventId;
      googleMeetLink = result.googleMeetLink;
    } catch (calErr) {
      // Continue without Calendar integration if credentials not configured
      console.warn("[meetings] Google Calendar not configured:", calErr);
    }

    // Insert meeting record
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        project_id: body.project_id || null,
        title: body.title,
        type: body.type,
        description: body.description,
        meeting_date: body.meeting_date,
        start_time: body.start_time,
        end_time: body.end_time,
        timezone: body.timezone,
        recurrence: body.recurrence,
        recurrence_end_date: body.recurrence_end_date,
        google_calendar_event_id: googleEventId,
        google_meet_link: googleMeetLink,
        reminder_minutes_before: body.reminder_minutes_before,
      })
      .select("*")
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ ok: false, error: meetingError?.message }, { status: 500 });
    }

    const newMeeting = meeting as Meeting;

    // Insert attendees
    if (body.attendee_ids.length > 0) {
      await supabase.from("meeting_attendees").insert(
        body.attendee_ids.map((id) => ({
          meeting_id: newMeeting.id,
          contributor_id: id,
        }))
      );
    }

    // Send confirmation emails
    const recurrenceLabel = body.recurrence === "None" ? "One-time" : body.recurrence;
    await Promise.allSettled(
      attendeeContributors.map((c) =>
        sendMeetingConfirmationEmail({
          to: c.email,
          recipientName: c.full_name ?? c.email,
          title: body.title,
          meetingDate: body.meeting_date,
          startTime: body.start_time.slice(0, 5),
          endTime: body.end_time.slice(0, 5),
          timezone: body.timezone,
          recurrence: recurrenceLabel,
          description: body.description,
          meetLink: googleMeetLink,
        })
      )
    );

    return NextResponse.json({ ok: true, meeting: newMeeting, googleMeetLink });
  } catch (err) {
    console.error("[POST /api/meetings]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
