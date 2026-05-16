import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () =>
        set((s) => {
          const next = !s.dark;
          applyTheme(next);
          return { dark: next };
        }),
      setDark: (v: boolean) => {
        applyTheme(v);
        set({ dark: v });
      },
    }),
    { name: "theme" },
  ),
);

export function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function initTheme() {
  const stored = localStorage.getItem("theme");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      applyTheme(!!parsed?.state?.dark);
    } catch {
      /* ignore */
    }
  }
}
