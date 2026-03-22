import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { T } from "../../theme/tokens";

export default function Layout({ children, alertCount = 0 }) {
  return (
    <Box sx={{ bgcolor: T.bg, minHeight: "100vh", display: "flex" }}>
      <Sidebar />
      <Header alertCount={alertCount} />
      <Box component="main" sx={{ ml: "256px", pt: "88px", px: 4, pb: 6,
        minHeight: "100vh", flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
