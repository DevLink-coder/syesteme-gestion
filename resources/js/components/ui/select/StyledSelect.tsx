import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface StyledSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  controlClassName?: string;
  id?: string;
  disabled?: boolean;
}

export const StyledSelect: React.FC<StyledSelectProps> = ({ options, value, onChange, placeholder = "Sélectionner", className = "", controlClassName = "", id, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`} id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={`flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-left text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:dark:bg-gray-800 disabled:dark:text-gray-400 ${selected ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"} ${controlClassName}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-40 right-0 mt-[17px] flex max-h-[260px] w-[260px] max-w-full flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark no-scrollbar">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Aucune option</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium transition-colors group text-theme-sm ${isSelected ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"}`}
                    >
                      {opt.label}
                      {isSelected && <span className="ml-auto text-brand-500">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default StyledSelect;
