import { cn } from "@/lib/utils";
import type { ThemeColor } from "@/lib/theme";

interface Props {
  label: string;
  color: ThemeColor;
  dot?: boolean;
  className?: string;
}

export default function StatusPill({ label, color, dot = true, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
        color.bg,
        color.fg,
        className
      )}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color.dot }}
        />
      )}
      {label}
    </span>
  );
}
