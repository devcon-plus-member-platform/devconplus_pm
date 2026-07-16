import { cn } from "@/lib/utils";

interface Props {
  /** 0–100 */
  value: number;
  color?: string;
  trackClassName?: string;
  className?: string;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  color = "#3b5ee8",
  trackClassName,
  className,
  showLabel = false,
}: Props) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden", trackClassName)}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] text-gray-400 font-medium shrink-0 tabular-nums">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
