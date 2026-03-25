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
    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
      <Input
        className="h-10 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
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
        className="size-9 rounded-full p-0"
        disabled={props.disabled || !props.value.trim() || props.busy}
        onClick={props.onSubmit}
        type="button"
        variant="ghost"
      >
        <SendIcon className="size-4" />
        <span className="sr-only">发送评论</span>
      </Button>
    </div>
  );
}
