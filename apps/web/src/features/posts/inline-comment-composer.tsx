import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InlineCommentComposerProps = {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  busy?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function InlineCommentComposer(props: InlineCommentComposerProps) {
  return (
    <div className="flex items-center gap-2 rounded-[calc(var(--radius-control)-0.05rem)] border border-border/80 bg-surface-1 px-2.5 py-2">
      <Input
        className="h-6 rounded-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 md:h-6"
        disabled={props.disabled}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            props.onSubmit();
          }
        }}
        placeholder={props.placeholder ?? "写下你的评论..."}
        value={props.value}
      />
      <Button
        className="shrink-0 rounded-full"
        disabled={props.disabled || !props.value.trim() || props.busy}
        onClick={props.onSubmit}
        size="icon-sm"
        type="button"
        variant="hero"
      >
        <SendIcon className="size-4" />
        <span className="sr-only">发送评论</span>
      </Button>
    </div>
  );
}
