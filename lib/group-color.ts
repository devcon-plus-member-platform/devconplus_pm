export const GROUP_COLOR_PALETTE = [
  { label: "Blue",    value: "#3b82f6" },
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Indigo",  value: "#6366f1" },
  { label: "Teal",    value: "#14b8a6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Lime",    value: "#84cc16" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Orange",  value: "#f97316" },
  { label: "Red",     value: "#ef4444" },
  { label: "Rose",    value: "#f43f5e" },
  { label: "Pink",    value: "#ec4899" },
  { label: "Cyan",    value: "#06b6d4" },
];

export const GROUP_DEFAULT_ACCENTS = GROUP_COLOR_PALETTE.map((c) => c.value);

export function groupColorStorageKey(groupId: string): string {
  return `devcon-group-color-${groupId}`;
}

export function defaultGroupAccent(colorIdx: number): string {
  return GROUP_DEFAULT_ACCENTS[colorIdx % GROUP_DEFAULT_ACCENTS.length];
}
