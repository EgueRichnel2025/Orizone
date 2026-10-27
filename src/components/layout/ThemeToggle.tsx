import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_PREFERENCE_KEY = "orizone-theme-preference";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    const preference = window.localStorage.getItem(
      THEME_PREFERENCE_KEY,
    );

    if (preference === "light" || preference === "dark") {
      return preference;
    }
  } catch {
    // Le thème sombre reste le thème par défaut.
  }

  return "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function handleThemeToggle() {
    setTheme((current) => {
      const nextTheme: Theme =
        current === "dark" ? "light" : "dark";

      try {
        window.localStorage.setItem(
          THEME_PREFERENCE_KEY,
          nextTheme,
        );
      } catch {
        // Le changement de thème reste possible sans stockage local.
      }

      return nextTheme;
    });
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleThemeToggle}
      aria-label={
        isDark
          ? "Activer le thème clair"
          : "Activer le thème sombre"
      }
      title={
        isDark
          ? "Activer le thème clair"
          : "Activer le thème sombre"
      }
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.8} />
      ) : (
        <Moon size={18} strokeWidth={1.8} />
      )}
    </button>
  );
}