import type { InputHTMLAttributes } from "react";
import { SearchIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Buscar...",
  className,
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value);

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <SearchIcon className="size-4 text-zinc-400 absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
        {...props}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 p-0.5 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
