import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: string;
  /** Small colored dot next to the label. Defaults to on whenever an accent is set. */
  dot?: boolean;
  subtext?: string;
  className?: string;
}

export default function StatCard({ label, value, icon, accent = "#1f2937", dot = true, subtext, className }: Props) {
  return (
    <div
      className={cn(
        "bg-white border border-surface-border rounded-xl px-5 py-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        {icon ? (
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            {icon}
          </div>
        ) : (
          dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        )}
      </div>
      <p className="text-2xl font-bold leading-tight" style={{ color: accent }}>
        {value}
      </p>
      {subtext && <p className="text-[11px] text-gray-400 mt-1 truncate">{subtext}</p>}
    </div>
  );
}
