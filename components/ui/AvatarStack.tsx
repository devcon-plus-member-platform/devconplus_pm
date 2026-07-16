import { cn } from "@/lib/utils";

export interface AvatarItem {
  id: string;
  label: string;
  color?: string;
}

interface Props {
  items: AvatarItem[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export default function AvatarStack({ items, max = 3, size = "sm", className }: Props) {
  const shown = items.slice(0, max);
  const overflow = items.length - shown.length;
  const dims = size === "sm" ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-xs";

  if (items.length === 0) return null;

  return (
    <div className={cn("flex -space-x-1.5 items-center", className)}>
      {shown.map((item) => (
        <span
          key={item.id}
          title={item.label}
          className={cn(
            "rounded-full flex items-center justify-center font-bold uppercase ring-2 ring-white shrink-0 text-white",
            dims
          )}
          style={{ backgroundColor: item.color ?? "#3b5ee8" }}
        >
          {item.label[0]}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "rounded-full flex items-center justify-center font-bold ring-2 ring-white shrink-0 bg-gray-200 text-gray-600",
            dims
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
