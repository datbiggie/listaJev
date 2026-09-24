"use client";

import { useEffect, useState } from "react";
import { DatabaseIcon } from "@/components/icons";

export function ColdStartNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 shadow-2xs transition-opacity animate-in fade-in duration-300">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
        <DatabaseIcon className="size-4 animate-spin" />
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-xs text-amber-950">
          Reactivando instancias en la nube
        </span>
        <span className="text-xs text-amber-800/90">
          La base de datos o el servidor están reanudando operaciones tras inactividad. Esto tomará sólo unos instantes.
        </span>
      </div>
    </div>
  );
}
