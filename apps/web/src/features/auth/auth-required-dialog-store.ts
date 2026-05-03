import { create } from "zustand";

type AuthDialogState = {
  open: boolean;
  title: string;
  description: string;
  redirectTo: string;
  openDialog: (input?: Partial<Pick<AuthDialogState, "title" | "description" | "redirectTo">>) => void;
  closeDialog: () => void;
};

const defaultTitle = "请先登录";
const defaultDescription = "登录后才能继续操作。";

export const useAuthRequiredDialogStore = create<AuthDialogState>((set) => ({
  open: false,
  title: defaultTitle,
  description: defaultDescription,
  redirectTo: "/home",
  openDialog: (input) => {
    set({
      open: true,
      title: input?.title ?? defaultTitle,
      description: input?.description ?? defaultDescription,
      redirectTo: input?.redirectTo ?? "/home"
    });
  },
  closeDialog: () => {
    set({ open: false });
  }
}));
