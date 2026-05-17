import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  dark: boolean;
  toggle: (originX?: number, originY?: number) => void;
  setDark: (v: boolean) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggle: (originX?: number, originY?: number) => {
        const next = !get().dark;
        runThemeTransition(next, originX, originY, () => {
          applyTheme(next);
          set({ dark: next });
        });
      },
      setDark: (v: boolean) => {
        applyTheme(v);
        set({ dark: v });
      },
    }),
    { name: "theme" },
  ),
);

export function applyTheme(dark: boolean) {
  if (typeof document === "undefined") return;
  if (dark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

function runThemeTransition(
  next: boolean,
  originX: number | undefined,
  originY: number | undefined,
  swap: () => void,
) {
  if (typeof document === "undefined") return swap();
  // @ts-expect-error startViewTransition is experimental
  const supports = typeof document.startViewTransition === "function";
  if (!supports) return swap();

  const x = originX ?? window.innerWidth - 40;
  const y = originY ?? 60;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  // @ts-expect-error experimental
  const transition = document.startViewTransition(swap);
  transition.ready.then(() => {
    const clipFrom = `circle(0px at ${x}px ${y}px)`;
    const clipTo = `circle(${endRadius}px at ${x}px ${y}px)`;
    document.documentElement.animate(
      {
        clipPath: next ? [clipFrom, clipTo] : [clipTo, clipFrom],
      },
      {
        duration: 650,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: next ? "::view-transition-new(root)" : "::view-transition-old(root)",
      },
    );
  });
}

export function initTheme() {
  if (typeof window === "undefined") return;
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
