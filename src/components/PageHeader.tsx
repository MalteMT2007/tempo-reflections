import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
};

/**
 * Bold, Apple-style page header. Replaces greetings.
 * Always anchors the user with a clear page name.
 */
export function PageHeader({ title, subtitle, trailing, className = "" }: Props) {
  return (
    <header className={`flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[14px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0 flex items-center gap-2">{trailing}</div>}
    </header>
  );
}
