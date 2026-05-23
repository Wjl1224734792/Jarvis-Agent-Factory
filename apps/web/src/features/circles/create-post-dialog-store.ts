import { create } from "zustand";

interface CreatePostDialogState {
  open: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

export const useCreatePostDialogStore = create<CreatePostDialogState>((set) => ({
  open: false,
  openDialog: () => {
    set({ open: true });
  },
  closeDialog: () => {
    set({ open: false });
  }
}));
