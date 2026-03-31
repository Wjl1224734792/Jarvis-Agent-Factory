import { Loader2Icon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveInlineCommentComposerState } from "./inline-comment-composer-state";

type InlineCommentComposerProps = {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  inputDisabled?: boolean;
  busy?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function InlineCommentComposer(props: InlineCommentComposerProps) {
  const state = resolveInlineCommentComposerState({
    value: props.value,
    disabled: props.disabled,
    inputDisabled: props.inputDisabled,
    busy: props.busy
  });

  return (
    <div
      className={`flex items-center gap-2 rounded-[calc(var(--radius-control)-0.05rem)] border px-2.5 py-2 transition ${
        props.busy
          ? "border-primary/30 bg-surface-2"
          : "border-border/80 bg-surface-1"
      }`}
    >
      <Input
        className="h-6 rounded-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 md:h-6"
        disabled={state.inputDisabled}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (state.submitDisabled) {
              return;
            }
            props.onSubmit();
          }
        }}
        placeholder={props.placeholder ?? "写下你的评论..."}
        value={props.value}
      />
      <Button
        className="shrink-0 rounded-full"
        disabled={state.submitDisabled}
        onClick={props.onSubmit}
        size="icon-sm"
        type="button"
        variant="hero"
      >
        {props.busy ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SendIcon className="size-4" />
        )}
        <span className="sr-only">{props.busy ? "正在发送评论" : "发送评论"}</span>
      </Button>
    </div>
  );
}
