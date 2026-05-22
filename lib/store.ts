import { create } from "zustand";
import type { AuthStore, Contributor } from "@/types";

export const useAuthStore = create<AuthStore>((set) => ({
  contributor: null,
  setContributor: (contributor: Contributor | null) => set({ contributor }),
}));
