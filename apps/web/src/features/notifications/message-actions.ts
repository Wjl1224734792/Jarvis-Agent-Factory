type MessageActionItem = {
  id: string;
  isRead: boolean;
  target: {
    href: string;
    openInNewTab: boolean;
  };
};

export async function openMessageCenterItem(input: {
  item: MessageActionItem;
  openTarget: (target: MessageActionItem["target"]) => void;
  markAsRead: (id: string) => Promise<unknown>;
  refresh: () => Promise<unknown>;
  onError: (message: string | null) => void;
  onPendingChange: (pendingId: string | null) => void;
}) {
  input.onError(null);
  input.onPendingChange(input.item.id);

  try {
    input.openTarget(input.item.target);
    if (!input.item.isRead) {
      await input.markAsRead(input.item.id);
      await input.refresh();
    }
  } catch (error: unknown) {
    input.onError(error instanceof Error ? error.message : "消息状态更新失败");
  } finally {
    input.onPendingChange(null);
  }
}
