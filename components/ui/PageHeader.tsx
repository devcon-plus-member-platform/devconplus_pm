import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  title: string;
  contextChip?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * White header bar used at the top of every authenticated page's main
 * content area, kept visually consistent across the app: title + optional
 * context chip on the left, one primary action on the right.
 */
export default function PageHeader({ title, contextChip, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-surface-border shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
        {typeof contextChip === "string" ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium whitespace-nowrap">
            {contextChip}
          </span>
        ) : (
          contextChip
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
