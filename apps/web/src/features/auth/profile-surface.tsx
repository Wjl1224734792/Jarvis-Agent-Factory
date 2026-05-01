import { Button } from "@/components/ui/button";

export function ProfilePagination(props: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
      <Button
        disabled={props.page <= 1}
        onClick={() => props.onPageChange(props.page - 1)}
        size="sm"
        type="button"
        variant="ghost"
      >
        上一页
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        {props.page} / {props.totalPages}
      </span>
      <Button
        disabled={props.page >= props.totalPages}
        onClick={() => props.onPageChange(props.page + 1)}
        size="sm"
        type="button"
        variant="ghost"
      >
        下一页
      </Button>
    </div>
  );
}
