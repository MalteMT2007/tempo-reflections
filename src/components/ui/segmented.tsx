import { ReactNode } from "react";

type Segment = { value: string; label: ReactNode };

export function Segmented({
  value,
  onChange,
  segments,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  segments: Segment[];
  className?: string;
}) {
  return (
    <div className={`inline-flex glass rounded-full p-1 ${className}`}>
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={`relative px-5 h-9 rounded-full text-[13.5px] font-medium spring-tap transition-colors ${
              active
                ? "bg-white text-[hsl(250_30%_6%)]"
                : "text-foreground/65 hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
