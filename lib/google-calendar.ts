// Google Calendar API integration using a Service Account
//
// Prerequisites (PM must complete before deploying Batch 7):
//   1. Go to console.cloud.google.com → enable "Google Calendar API"
//   2. Create a Service Account → download JSON key
//   3. Share the PM's Google Calendar with the service account email
//      (give it "Make changes to events" permission)
//   4. Add to .env.local / Vercel project settings:
//        GOOGLE_SERVICE_ACCOUNT_EMAIL=sa@project.iam.gserviceaccount.com
//        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//        GOOGLE_CALENDAR_ID=pm@example.com   (PM's Google Calendar ID)

import { google } from "googleapis";
import { v4 as uuidv4 } from "crypto";
import type { MeetingRecurrence } from "@/types";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google service account credentials not configured.");

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function getCalendar() {
  return google.calendar({ version: "v3", auth: getAuth() });
}

function calendarId() {
  const id = process.env.GOOGLE_CALENDAR_ID;
  if (!id) throw new Error("GOOGLE_CALENDAR_ID not set.");
  return id;
}

// ─── RRULE builder ────────────────────────────────────────────────────────────

export function buildRRULE(recurrence: MeetingRecurrence, endDate?: string | null): string[] {
  if (recurrence === "None" || !endDate) return [];
  const until = endDate.replace(/-/g, ""); // YYYYMMDD

  const rules: Record<Exclude<MeetingRecurrence, "None">, string> = {
    Daily:    `RRULE:FREQ=DAILY;UNTIL=${until}`,
    Weekly:   `RRULE:FREQ=WEEKLY;UNTIL=${until}`,
    Biweekly: `RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=${until}`,
    Monthly:  `RRULE:FREQ=MONTHLY;UNTIL=${until}`,
  };
  return [rules[recurrence as Exclude<MeetingRecurrence, "None">]];
}

// ─── Create a calendar event with Google Meet ─────────────────────────────────

interface CreateEventParams {
  title: string;
  description: string | null;
  meetingDate: string;      // YYYY-MM-DD
  startTime: string;        // HH:MM:SS
  endTime: string;          // HH:MM:SS
  timezone: string;         // e.g. "Asia/Manila"
  attendeeEmails: string[];
  recurrence: MeetingRecurrence;
  recurrenceEndDate?: string | null;
}

interface CreateEventResult {
  googleEventId: string;
  googleMeetLink: string | null;
}

export async function createCalendarEvent(
  params: CreateEventParams
): Promise<CreateEventResult> {
  const calendar = getCalendar();

  const startDateTime = `${params.meetingDate}T${params.startTime}`;
  const endDateTime   = `${params.meetingDate}T${params.endTime}`;

  const { data } = await calendar.events.insert({
    calendarId: calendarId(),
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.title,
      description: params.description ?? undefined,
      start: { dateTime: startDateTime, timeZone: params.timezone },
      end:   { dateTime: endDateTime,   timeZone: params.timezone },
      attendees: params.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      recurrence: buildRRULE(params.recurrence, params.recurrenceEndDate),
      reminders: { useDefault: false, overrides: [] },
    },
  });

  const meetLink =
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;

  return {
    googleEventId: data.id!,
    googleMeetLink: meetLink,
  };
}

// ─── Update an existing event ─────────────────────────────────────────────────

interface UpdateEventParams {
  googleEventId: string;
  title?: string;
  description?: string | null;
  meetingDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  attendeeEmails?: string[];
}

export async function updateCalendarEvent(params: UpdateEventParams): Promise<void> {
  const calendar = getCalendar();
  const patch: Record<string, unknown> = {};

  if (params.title)       patch.summary = params.title;
  if (params.description !== undefined) patch.description = params.description;
  if (params.meetingDate && params.startTime) {
    patch.start = { dateTime: `${params.meetingDate}T${params.startTime}`, timeZone: params.timezone };
    patch.end   = { dateTime: `${params.meetingDate}T${params.endTime}`,   timeZone: params.timezone };
  }
  if (params.attendeeEmails) {
    patch.attendees = params.attendeeEmails.map((email) => ({ email }));
  }

  await calendar.events.patch({
    calendarId: calendarId(),
    eventId: params.googleEventId,
    requestBody: patch,
  });
}

// ─── Cancel (delete) an event ─────────────────────────────────────────────────

export async function cancelCalendarEvent(googleEventId: string): Promise<void> {
  const calendar = getCalendar();
  await calendar.events.delete({
    calendarId: calendarId(),
    eventId: googleEventId,
    sendUpdates: "all", // Google sends cancellation notices automatically
  });
}

// Node crypto doesn't export uuidv4 — use this simple helper instead
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
