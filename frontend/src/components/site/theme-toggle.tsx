"use client";

/**
 * Switches between light and dark, and remembers the choice.
 *
 * The button holds no React state. Which icon shows is decided by CSS from the
 * `data-theme` attribute on `<html>` (see globals.css) — reading the theme
 * during render would mean guessing on the server and correcting on the client,
 * which is a hydration mismatch by construction.
 *
 * Clicking always sets an explicit `data-theme`, so from then on the choice
 * wins over the operating system. There is no third "follow the system" state
 * in the UI; clearing localStorage restores it.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const explicit = root.dataset.theme;

    // With nothing set yet, the current appearance is whatever the OS asked
    // for, so that is what we invert.
    const isDark = explicit
      ? explicit === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    const next = isDark ? "light" : "dark";

    root.dataset.theme = next;

    try {
      localStorage.setItem("theme", next);
    } catch {
      // Safari in private mode throws on write; the toggle still works for
      // this page view, it just will not be remembered.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
    >
      {/* Shown in light mode: clicking goes dark. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="theme-icon-light size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 13.5A8.5 8.5 0 1110.5 4a6.7 6.7 0 009.5 9.5z" />
      </svg>

      {/* Shown in dark mode: clicking goes light. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="theme-icon-dark size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </svg>
    </button>
  );
}
