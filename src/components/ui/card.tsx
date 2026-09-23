import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  children: ReactNode;
}

export function Card({
  padding = true,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-xs transition-shadow",
        padding && "p-4 sm:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
