type InlineCommentComposerStateInput = {
  value: string;
  disabled?: boolean;
  inputDisabled?: boolean;
  busy?: boolean;
};

export function resolveInlineCommentComposerState(
  input: InlineCommentComposerStateInput
) {
  return {
    inputDisabled: Boolean(input.busy || input.inputDisabled),
    submitDisabled: Boolean(input.busy || input.disabled || !input.value.trim())
  };
}
