import { useTheme } from "@/providers/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-500"
      aria-label={isDark ? "Zum Hellmodus wechseln" : "Zum Dunkelmodus wechseln"}
    >
      <span className="text-sm" aria-hidden="true">
        {isDark ? "🌙" : "☀️"}
      </span>
      {isDark ? "Dunkel" : "Hell"}
    </button>
  );
}
