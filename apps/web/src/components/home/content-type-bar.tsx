import { cn } from "@/lib/utils";

export type ContentType = "all" | "article" | "circle_post" | "model" | "ranking";

const contentTypeOptions: { id: ContentType; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "article", label: "文章" },
  { id: "circle_post", label: "飞友圈" },
  { id: "model", label: "机型" },
  { id: "ranking", label: "榜单" },
];

export function ContentTypeBar({
  active,
  onChange,
}: {
  active: ContentType;
  onChange: (type: ContentType) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto whitespace-nowrap border-b border-border px-1 py-1.5">
      {contentTypeOptions.map((option) => (
        <button
          className={cn(
            "rounded-full px-3 py-1 text-[0.8rem] transition-colors",
            active === option.id
              ? "bg-primary text-primary-foreground font-medium"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
