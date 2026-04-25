import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export function ProfileFilterBar(props: {
  options: FilterOption[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", props.className)}>
      {props.options.map((option) => {
        const isActive = props.active === option.value;
        return (
          <button
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground"
            )}
            key={option.value}
            onClick={() => props.onChange(option.value)}
            type="button"
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="text-xs opacity-80">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
