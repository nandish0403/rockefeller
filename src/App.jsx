import { useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeModeProvider, useThemeMode } from "./context/ThemeModeContext";
import router from "./routes/router";

function buildTheme(mode) {
  const isLight = mode === "light";

  return createTheme({
    palette: {
      mode,
      primary: isLight ? { main: "#5f5e5f" } : { main: "#ffb3ad" },
      secondary: isLight ? { main: "#ba1b24" } : { main: "#ffb95f" },
      success: isLight ? { main: "#2e7d32" } : { main: "#4edea3" },
      error: isLight ? { main: "#9f403d" } : { main: "#ff5451" },
      warning: isLight ? { main: "#b06c00" } : { main: "#ffb95f" },
      background: isLight
        ? { default: "#f8f9fa", paper: "#ffffff" }
        : { default: "#131313", paper: "#1c1b1b" },
      text: isLight
        ? { primary: "#2b3437", secondary: "#586064" }
        : { primary: "#e5e2e1", secondary: "#e4beba" },
      divider: isLight ? "rgba(171,179,183,0.45)" : "rgba(91,64,62,0.18)",
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: isLight ? 6 : 4 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: { styleOverrides: { root: { borderRadius: isLight ? 6 : 4 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: isLight ? 6 : 4 } } },
    },
  });
}

function AppWithTheme() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppWithTheme />
        </NotificationProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
}
