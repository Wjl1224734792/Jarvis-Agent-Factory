import { describe, expect, it, vi } from "vitest";
import { openMessageCenterItem } from "../src/features/notifications/message-actions";

describe("message-actions", () => {
  it("opens the target before awaiting read-sync work", async () => {
    const calls: string[] = [];

    await openMessageCenterItem({
      item: {
        id: "message_1",
        isRead: false,
        target: {
          href: "/posts/post_1",
          openInNewTab: true
        }
      },
      openTarget: () => {
        calls.push("open");
      },
      markAsRead: async () => {
        calls.push("mark");
      },
      refresh: async () => {
        calls.push("refresh");
      },
      onError: vi.fn(),
      onPendingChange: vi.fn()
    });

    expect(calls).toEqual(["open", "mark", "refresh"]);
  });

  it("keeps the target open even when read-sync refresh fails", async () => {
    const openTarget = vi.fn();
    const onError = vi.fn();

    await openMessageCenterItem({
      item: {
        id: "message_2",
        isRead: false,
        target: {
          href: "/rankings/ranking_1",
          openInNewTab: false
        }
      },
      openTarget,
      markAsRead: async () => undefined,
      refresh: async () => {
        throw new Error("refresh failed");
      },
      onError,
      onPendingChange: vi.fn()
    });

    expect(openTarget).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("refresh failed");
  });
});
