import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/lib/i18n";

export type Theme = "dark" | "light";
const KEY = "fdr.theme";

function read(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

/** Puts the chosen theme on <html> so the tokens in styles.css take over. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  if (theme === "light") {
    // the saved dark palette must not leak into the light look
    root.style.removeProperty("--background");
    root.style.removeProperty("--accent");
  }
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = read();
    setTheme(initial);
    applyTheme(initial);
    const onChange = () => {
      const next = read();
      setTheme(next);
      applyTheme(next);
    };
    window.addEventListener("fdr-theme", onChange);
    return () => window.removeEventListener("fdr-theme", onChange);
  }, []);

  const set = (next: Theme) => {
    localStorage.setItem(KEY, next);
    setTheme(next);
    applyTheme(next);
    window.dispatchEvent(new Event("fdr-theme"));
  };

  return [theme, set];
}

/** Dark / light switch shown next to the language toggle. */
export function ThemeToggle() {
  const t = useT();
  const [theme, set] = useTheme();
  return (
    <div className="flex items-center overflow-hidden rounded-full border border-border bg-card">
      <button
        type="button"
        onClick={() => set("dark")}
        aria-label={t("Dark theme")}
        className={`flex items-center px-2.5 py-1 transition-colors ${
          theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        <Moon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => set("light")}
        aria-label={t("Light theme")}
        className={`flex items-center px-2.5 py-1 transition-colors ${
          theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        <Sun className="size-3.5" />
      </button>
    </div>
  );
}
