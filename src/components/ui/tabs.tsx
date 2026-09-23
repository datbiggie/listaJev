import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 p-1 border border-zinc-200/80",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              isActive
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-bold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-mono leading-none",
                  isActive
                    ? "bg-zinc-100 text-zinc-800 border border-zinc-200"
                    : "bg-zinc-200 text-zinc-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
