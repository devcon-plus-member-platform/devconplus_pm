import { cn } from "@/lib/utils";

interface Props {
  label: string;
  color?: string;
  className?: string;
}

export default function Tag({ label, color = "#3b5ee8", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
        className
      )}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {label}
    </span>
  );
}
