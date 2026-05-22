// ─── Core domain types ────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Contributor {
  id: string;
  email: string;
  full_name: string | null;
  role_id: string | null;
  telegram_username: string | null;
  deleted_at: string | null;
  created_at: string;
  // joined from roles
  role?: Role;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  creator?: Contributor;
}

export interface Group {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
  // joined
  tasks?: Task[];
}

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Done"
  | "Help"
  | "I am Stuck"
  | "For Improvements";

export interface Task {
  id: string;
  group_id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  status: TaskStatus;
  timeline_start: string | null;
  timeline_end: string | null;
  due_date: string | null;
  pr_link: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // joined
  assignee?: Contributor;
  attachments?: TaskAttachment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
  // joined
  uploader?: Contributor;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  sent_at: string | null;
  created_at: string;
  // joined
  author?: Contributor;
}

export type QAStatus = "Pass" | "Fail" | "Blocked" | "Not Run";

export interface QATest {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: QAStatus;
  assigned_to: string | null;
  bug_report: string | null;
  bug_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  assignee?: Contributor;
}

// ─── Bugs ─────────────────────────────────────────────────────────────────────

export type BugSeverity = "Critical" | "High" | "Medium" | "Low";
export type BugStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "Cannot Reproduce";

export interface Bug {
  id: string;
  project_id: string;
  title: string;
  description: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  severity: BugSeverity;
  status: BugStatus;
  reported_by: string | null;
  assigned_to: string | null;
  qa_test_id: string | null;
  task_id: string | null;
  pr_link: string | null;
  environment: string | null;
  browser_device: string | null;
  screenshot_urls: string[];
  created_at: string;
  updated_at: string;
  // joined
  reporter?: Contributor;
  assignee?: Contributor;
  qa_test?: { id: string; title: string };
  linked_task?: { id: string; title: string };
}

export interface BugActivity {
  id: string;
  bug_id: string;
  changed_by: string | null;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  // joined
  changer?: Contributor;
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export type MeetingType = "Standup" | "Audit" | "Other";
export type MeetingRecurrence = "None" | "Daily" | "Weekly" | "Biweekly" | "Monthly";
export type MeetingStatus = "Scheduled" | "Cancelled" | "Completed";
export type RsvpStatus = "Pending" | "Accepted" | "Declined";

export interface Meeting {
  id: string;
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
  google_calendar_event_id: string | null;
  google_meet_link: string | null;
  reminder_minutes_before: number;
  status: MeetingStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  attendees?: MeetingAttendee[];
  creator?: Contributor;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  contributor_id: string;
  rsvp_status: RsvpStatus;
  // joined
  contributor?: Contributor;
}

// ─── UI / view helpers ────────────────────────────────────────────────────────

export interface BoardColumn {
  group: Group;
  tasks: Task[];
}

export interface BoardData {
  project: Project;
  columns: BoardColumn[];
}

// ─── Auth store ───────────────────────────────────────────────────────────────

export interface AuthStore {
  contributor: Contributor | null;
  setContributor: (c: Contributor | null) => void;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ─── Form payloads ────────────────────────────────────────────────────────────

export interface CreateTaskPayload {
  group_id: string;
  project_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  status?: TaskStatus;
  timeline_start?: string;
  timeline_end?: string;
  due_date?: string;
  pr_link?: string;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  id: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
}

export interface CreateQATestPayload {
  project_id: string;
  title: string;
  description?: string;
  category?: string;
  assigned_to?: string;
}

export interface UpdateQATestPayload extends Partial<CreateQATestPayload> {
  id: string;
  status?: QAStatus;
  bug_report?: string;
}

// ─── Supabase Database type ───────────────────────────────────────────────────
// Row types use only actual DB columns (no joined / computed fields).
// Supabase's generic machinery requires Views/Functions/Enums/CompositeTypes.

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string; name: string; description: string | null;
          color: string; created_at: string;
        };
        Insert: {
          id?: string; name: string; description?: string | null;
          color?: string; created_at?: string;
        };
        Update: {
          id?: string; name?: string; description?: string | null;
          color?: string; created_at?: string;
        };
        Relationships: [];
      };
      contributors: {
        Row: {
          id: string; email: string; full_name: string | null;
          role_id: string | null; telegram_username: string | null;
          deleted_at: string | null; created_at: string;
        };
        Insert: {
          id?: string; email: string; full_name?: string | null;
          role_id?: string | null; telegram_username?: string | null;
          deleted_at?: string | null; created_at?: string;
        };
        Update: {
          id?: string; email?: string; full_name?: string | null;
          role_id?: string | null; telegram_username?: string | null;
          deleted_at?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string; name: string; description: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; name: string; description?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Update: {
          id?: string; name?: string; description?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string; project_id: string; name: string;
          position: number; created_at: string;
        };
        Insert: {
          id?: string; project_id: string; name: string;
          position?: number; created_at?: string;
        };
        Update: {
          id?: string; project_id?: string; name?: string;
          position?: number; created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string; group_id: string; project_id: string;
          title: string; description: string | null;
          assignee_id: string | null; status: string;
          timeline_start: string | null; timeline_end: string | null;
          due_date: string | null; pr_link: string | null;
          position: number; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; group_id: string; project_id: string;
          title: string; description?: string | null;
          assignee_id?: string | null; status?: string;
          timeline_start?: string | null; timeline_end?: string | null;
          due_date?: string | null; pr_link?: string | null;
          position?: number; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; group_id?: string; project_id?: string;
          title?: string; description?: string | null;
          assignee_id?: string | null; status?: string;
          timeline_start?: string | null; timeline_end?: string | null;
          due_date?: string | null; pr_link?: string | null;
          position?: number; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      task_attachments: {
        Row: {
          id: string; task_id: string; file_name: string;
          file_url: string; uploaded_by: string | null; uploaded_at: string;
        };
        Insert: {
          id?: string; task_id: string; file_name: string;
          file_url: string; uploaded_by?: string | null; uploaded_at?: string;
        };
        Update: {
          id?: string; task_id?: string; file_name?: string;
          file_url?: string; uploaded_by?: string | null; uploaded_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string; title: string; body: string;
          created_by: string | null; sent_at: string | null; created_at: string;
        };
        Insert: {
          id?: string; title: string; body: string;
          created_by?: string | null; sent_at?: string | null; created_at?: string;
        };
        Update: {
          id?: string; title?: string; body?: string;
          created_by?: string | null; sent_at?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      qa_tests: {
        Row: {
          id: string; project_id: string; title: string;
          description: string | null; category: string | null; status: string;
          assigned_to: string | null; bug_report: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; project_id: string; title: string;
          description?: string | null; category?: string | null; status?: string;
          assigned_to?: string | null; bug_report?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; project_id?: string; title?: string;
          description?: string | null; category?: string | null; status?: string;
          assigned_to?: string | null; bug_report?: string | null;
          created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
