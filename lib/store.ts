import { create } from "zustand";
import type { AuthStore, Contributor } from "@/types";

export const useAuthStore = create<AuthStore>((set) => ({
  contributor: null,
  guestEmail: null,
  setContributor: (contributor: Contributor | null) => set({ contributor }),
  setGuestEmail: (guestEmail: string | null) => set({ guestEmail }),
}));
