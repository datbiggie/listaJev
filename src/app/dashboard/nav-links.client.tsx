"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UploadCloudIcon, AuditCheckIcon, BoxesIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: typeof UploadCloudIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Ingesta y Extracción",
    items: [
      {
        name: "Centro de Ingesta",
        href: "/dashboard/ingest",
        icon: UploadCloudIcon
      }
    ]
  },
  {
    label: "Conciliación Algorítmica",
    items: [
      {
        name: "Bandeja de Auditoría",
        href: "/dashboard/audit",
        icon: AuditCheckIcon
      }
    ]
  },
  {
    label: "Catálogo e Inventario",
    items: [
      {
        name: "Revisión de Stock",
        href: "/dashboard/stock",
        icon: BoxesIcon
      }
    ]
  }
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="space-y-5 px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {group.label}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 text-zinc-900 font-semibold"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive ? "text-zinc-900" : "text-zinc-400"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
