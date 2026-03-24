import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import SidebarNav from "./SidebarNav";
import Header from "./Header";

export default function AppShell() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ display: "flex", bgcolor: "#131313", minHeight: "100vh" }}>
      <SidebarNav />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <Box component="main" className="app-main" sx={{ ml: "256px", pt: "64px", px: 4, pb: 6 }}>
          <Box key={pathname} className="route-enter">
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
