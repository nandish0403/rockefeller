import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import router from "./routes/router";

// Dark theme aligned with the design token system in theme/tokens.js
const theme = createTheme({
  palette: {
    mode: "dark",
    primary:    { main: "#ffb3ad" },
    secondary:  { main: "#ffb95f" },
    success:    { main: "#4edea3" },
    error:      { main: "#ff5451" },
    warning:    { main: "#ffb95f" },
    background: { default: "#131313", paper: "#1c1b1b" },
    text:       { primary: "#e5e2e1", secondary: "#e4beba" },
    divider:    "rgba(91,64,62,0.18)",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiPaper:  { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 4 } } },
    MuiChip:   { styleOverrides: { root: { borderRadius: 4 } } },
  },
});

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
