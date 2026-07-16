import type {
  TaskStatus,
  TaskPriority,
  QAStatus,
  ProjectStatus,
  BugSeverity,
  BugStatus,
  MeetingStatus,
  RsvpStatus,
  MilestoneStatus,
  RiskProbability,
  RiskImpact,
  RiskStatus,
} from "@/types";

export interface ThemeColor {
  /** Hex color for dots, borders, chart marks, etc. */
  dot: string;
  /** Tailwind background class */
  bg: string;
  /** Tailwind text/foreground class */
  fg: string;
}

const neutral: ThemeColor = { dot: "#9ca3af", bg: "bg-gray-100", fg: "text-gray-600" };
const indigo: ThemeColor = { dot: "#3b5ee8", bg: "bg-brand-50", fg: "text-brand-700" };
const emerald: ThemeColor = { dot: "#10b981", bg: "bg-emerald-100", fg: "text-emerald-700" };
const amber: ThemeColor = { dot: "#f59e0b", bg: "bg-amber-100", fg: "text-amber-700" };
const orange: ThemeColor = { dot: "#f97316", bg: "bg-orange-100", fg: "text-orange-700" };
const violet: ThemeColor = { dot: "#8b5cf6", bg: "bg-violet-100", fg: "text-violet-700" };
const rose: ThemeColor = { dot: "#ef4444", bg: "bg-rose-100", fg: "text-rose-700" };

export const TASK_STATUS_THEME: Record<TaskStatus, ThemeColor> = {
  "Not Started": neutral,
  "In Progress": indigo,
  "Review": orange,
  "Done": emerald,
  "Help": amber,
  "I am Stuck": rose,
  "For Improvements": violet,
};

export const TASK_PRIORITY_THEME: Record<TaskPriority, ThemeColor> = {
  "Low": neutral,
  "Medium": indigo,
  "High": orange,
  "Critical": rose,
};

export const QA_STATUS_THEME: Record<QAStatus, ThemeColor> = {
  "Pass": emerald,
  "Fail": rose,
  "Blocked": orange,
  "Not Run": neutral,
};

export const PROJECT_STATUS_THEME: Record<ProjectStatus, ThemeColor> = {
  "Active": emerald,
  "Inactive": neutral,
};

export const BUG_SEVERITY_THEME: Record<BugSeverity, ThemeColor> = {
  "Low": neutral,
  "Medium": indigo,
  "High": orange,
  "Critical": rose,
};

export const BUG_STATUS_THEME: Record<BugStatus, ThemeColor> = {
  "Open": rose,
  "In Progress": indigo,
  "Resolved": emerald,
  "Closed": neutral,
  "Cannot Reproduce": violet,
};

export const MEETING_STATUS_THEME: Record<MeetingStatus, ThemeColor> = {
  "Scheduled": indigo,
  "Cancelled": rose,
  "Completed": emerald,
};

export const RSVP_STATUS_THEME: Record<RsvpStatus, ThemeColor> = {
  "Pending": amber,
  "Accepted": emerald,
  "Declined": rose,
};

export const MILESTONE_STATUS_THEME: Record<MilestoneStatus, ThemeColor> = {
  "Not Started": neutral,
  "In Progress": indigo,
  "At Risk": amber,
  "Achieved": emerald,
  "Missed": rose,
};

// Shared by RiskProbability and RiskImpact — both are "Low" | "Medium" | "High"
export const RISK_LEVEL_THEME: Record<RiskProbability | RiskImpact, ThemeColor> = {
  "Low": emerald,
  "Medium": amber,
  "High": rose,
};

export const RISK_STATUS_THEME: Record<RiskStatus, ThemeColor> = {
  "Open": rose,
  "Mitigating": amber,
  "Resolved": emerald,
  "Accepted": violet,
};
