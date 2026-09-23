import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "CONFIRMED"
  | "REQUIRES_REVIEW"
  | "REJECTED"
  | "DISPONIBLE"
  | "AGOTADO"
  | "DESCATALOGADO_PROVEEDOR"
  | "NO_CATALOGADO"
  | "ACTIVO"
  | "INACTIVO"
  | "ONLINE"
  | "UNVERIFIED"
  | "OFFLINE";

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusVariant | string;
  label?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  const normalized = status.toUpperCase().trim();

  let badgeClasses = "bg-zinc-100 text-zinc-700 border-zinc-200";
  let dotClass = "bg-zinc-400";
  let defaultLabel = normalized;

  switch (normalized) {
    case "CONFIRMED":
    case "DISPONIBLE":
    case "ACTIVO":
    case "ONLINE":
      badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-500/20";
      dotClass = "bg-emerald-500";
      defaultLabel =
        normalized === "CONFIRMED"
          ? "Confirmado"
          : normalized === "DISPONIBLE"
            ? "Disponible"
            : normalized === "ONLINE"
              ? "En Línea"
              : "Activo";
      break;

    case "REQUIRES_REVIEW":
    case "NO_CATALOGADO":
    case "UNVERIFIED":
      badgeClasses = "bg-amber-50 text-amber-700 border-amber-500/20";
      dotClass = "bg-amber-500";
      defaultLabel =
        normalized === "REQUIRES_REVIEW"
          ? "Revisión Manual"
          : normalized === "NO_CATALOGADO"
            ? "Sin Mapear"
            : "Standby (403)";
      break;

    case "REJECTED":
    case "AGOTADO":
    case "INACTIVO":
    case "OFFLINE":
      badgeClasses = "bg-rose-50 text-rose-700 border-rose-500/20";
      dotClass = "bg-rose-500";
      defaultLabel =
        normalized === "REJECTED"
          ? "Rechazado"
          : normalized === "AGOTADO"
            ? "Agotado (0)"
            : normalized === "OFFLINE"
              ? "Desconectado"
              : "Inactivo";
      break;

    case "DESCATALOGADO_PROVEEDOR":
      badgeClasses = "bg-zinc-100 text-zinc-600 border-zinc-200";
      dotClass = "bg-zinc-400";
      defaultLabel = "Descatalogado";
      break;
  }

  const displayText = label ?? defaultLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-semibold border transition-colors",
        badgeClasses,
        className
      )}
      {...props}
    >
      {showDot && (
        <span className={cn("size-1.5 rounded-full shrink-0", dotClass)} />
      )}
      <span>{displayText}</span>
    </span>
  );
}
