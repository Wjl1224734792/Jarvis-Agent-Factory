import { create } from "zustand";

interface CreateCircleDialogState {
  open: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

export const useCreateCircleDialogStore = create<CreateCircleDialogState>((set) => ({
  open: false,
  openDialog: () => {
    set({ open: true });
  },
  closeDialog: () => {
    set({ open: false });
  }
}));
