import { beforeEach, describe, expect, it } from "vitest";
import { useAuthRequiredDialogStore } from "../src/features/auth/auth-required-dialog-store";

describe("auth required dialog store", () => {
  beforeEach(() => {
    useAuthRequiredDialogStore.setState({
      open: false,
      title: "请先登录",
      description: "登录后才能继续操作。",
      redirectTo: "/home"
    });
  });

  it("opens dialog with custom payload", () => {
    useAuthRequiredDialogStore.getState().openDialog({
      title: "登录后才能评论",
      description: "评论前请先登录。",
      redirectTo: "/posts/post_1"
    });

    expect(useAuthRequiredDialogStore.getState()).toMatchObject({
      open: true,
      title: "登录后才能评论",
      description: "评论前请先登录。",
      redirectTo: "/posts/post_1"
    });
  });

  it("closes dialog without resetting copy", () => {
    useAuthRequiredDialogStore.getState().openDialog({
      title: "登录后才能收藏"
    });

    useAuthRequiredDialogStore.getState().closeDialog();

    expect(useAuthRequiredDialogStore.getState().open).toBe(false);
    expect(useAuthRequiredDialogStore.getState().title).toBe("登录后才能收藏");
  });
});
