import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: "warning" | "neutral" | "info" | "success";
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  badgeVariant = "warning",
  actions,
  children,
  className
}: PageHeaderProps) {
  const badgeClasses = {
    warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    neutral: "bg-zinc-100 text-zinc-800 border-zinc-200",
    info: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
  }[badgeVariant];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5",
        className
      )}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            {title}
          </h1>
          {badge && (
            <span
              className={cn(
                "rounded px-2.5 py-0.5 text-xs font-semibold tracking-wide border",
                badgeClasses
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">
            {description}
          </p>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}
