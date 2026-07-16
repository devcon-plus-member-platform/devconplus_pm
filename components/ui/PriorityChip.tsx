import { cn } from "@/lib/utils";
import type { ThemeColor } from "@/lib/theme";

interface Props {
  label: string;
  color: ThemeColor;
  className?: string;
}

export default function PriorityChip({ label, color, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap",
        color.bg,
        color.fg,
        className
      )}
      style={{ borderColor: `${color.dot}33` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color.dot }}
      />
      {label}
    </span>
  );
}
