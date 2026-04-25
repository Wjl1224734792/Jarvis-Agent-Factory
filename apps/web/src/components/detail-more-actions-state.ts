export type DetailMoreActionType = "report" | "edit" | "delete";

export function getDetailMoreActionTypes(input: {
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}): DetailMoreActionType[] {
  if (!input.isOwner) {
    return input.canReport ? ["report"] : [];
  }

  return [
    input.canEdit ? "edit" : null,
    input.canDelete ? "delete" : null
  ].filter((item): item is DetailMoreActionType => item !== null);
}

export function shouldRenderDetailMoreActions(input: {
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}) {
  return getDetailMoreActionTypes(input).length > 0;
}
