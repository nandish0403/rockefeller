import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import MapView from "../pages/MapView";
import ZoneDetails from "../pages/ZoneDetails";
import CrackReports from "../pages/CrackReports";
import Alerts from "../pages/Alerts";
import Reports from "../pages/Reports";
import Upload from "../pages/Upload";
import Analytics from "../pages/Analytics";
import Admin from "../pages/Admin";
import Profile from "../pages/Profile";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "map", element: <MapView /> },
      { path: "zones/:id", element: <ZoneDetails /> },
      { path: "crack-reports", element: <CrackReports /> },
      { path: "alerts", element: <Alerts /> },
      { path: "reports", element: <Reports /> },
      { path: "upload", element: <Upload /> },
      { path: "analytics", element: <Analytics /> },
      { path: "admin", element: <Admin /> },
      { path: "profile", element: <Profile /> }
    ]
  }
]);

export default router;
