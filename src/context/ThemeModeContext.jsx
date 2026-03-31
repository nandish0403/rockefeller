import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "rockefeller-theme-mode";

const ThemeModeContext = createContext({
  mode: "dark",
  setMode: () => {},
  toggleMode: () => {},
});

function applyModeClass(mode) {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(mode === "light" ? "theme-light" : "theme-dark");
  root.setAttribute("data-theme", mode);
}

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "light" || stored === "dark" ? stored : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    applyModeClass(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
