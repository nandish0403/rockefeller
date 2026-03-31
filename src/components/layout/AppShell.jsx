import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import SidebarNav from "./SidebarNav";
import Header from "./Header";

export default function AppShell() {
  const { pathname } = useLocation();
  const isMapRoute = pathname === "/map";
  const sidebarWidth = isMapRoute ? 96 : 256;

  return (
    <Box sx={{ display: "flex", bgcolor: (theme) => theme.palette.background.default, minHeight: "100vh", "--sidebar-w": `${sidebarWidth}px` }}>
      <SidebarNav />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <Box component="main" className="app-main" sx={{ ml: "var(--sidebar-w)", pt: "64px", px: 4, pb: 6, transition: "margin-left 0.28s ease" }}>
          {isMapRoute ? (
            <Outlet />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                className="route-enter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </Box>
      </Box>
    </Box>
  );
}
