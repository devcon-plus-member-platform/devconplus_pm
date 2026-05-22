"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "success",
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm",
        type === "success" && "bg-green-600 text-white",
        type === "error" && "bg-red-600 text-white",
        type === "info" && "bg-brand-600 text-white"
      )}
    >
      <span>{type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 text-sm leading-none ml-1"
      >
        ✕
      </button>
    </div>
  );
}
