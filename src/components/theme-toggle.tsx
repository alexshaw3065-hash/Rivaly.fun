"use client";

import { useSyncExternalStore } from "react";

// The `.light` class is external state (set by the blocking script in
// layout.tsx before hydration, and mutated directly on toggle) — modeled
// with useSyncExternalStore rather than useState+useEffect so there's no
// setState-during-effect cascade, and hydration falls back to the same
// dark default the CSS itself falls back to.
const THEME_EVENT = "rivaly-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("light");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isLight = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isLight;
    const root = document.documentElement;

    // See the `.theme-switching` rule in globals.css — briefly kill every
    // transition in the tree so color properties driven by the CSS vars
    // that just changed actually recompute, instead of sticking at their
    // pre-toggle value.
    root.classList.add("theme-switching");
    root.classList.toggle("light", next);
    void root.offsetHeight; // force reflow before re-enabling transitions
    requestAnimationFrame(() => root.classList.remove("theme-switching"));

    try {
      localStorage.setItem("rivaly-theme", next ? "light" : "dark");
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isLight}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      className="relative h-[22px] w-10 shrink-0 rounded-full border active:scale-[0.97]"
      style={{
        borderColor: "var(--border-strong)",
        background: "var(--surface-elevated)",
        transition: "transform 150ms ease-out",
      }}
    >
      <span
        className="absolute top-[3px] h-4 w-4 rounded-full"
        style={{
          left: 3,
          background: "var(--foreground)",
          transform: isLight ? "translateX(18px)" : "translateX(0)",
          transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
    </button>
  );
}
