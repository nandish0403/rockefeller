import { createBrowserRouter, Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import AppShell from "../components/layout/AppShell";
import Login from "../pages/login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import MapView from "../pages/MapView";
import ZoneDetails from "../pages/ZoneDetails";
import CrackReports from "../pages/CrackReports";
import Alerts from "../pages/Alerts";
import Reports from "../pages/Reports";
import Analytics from "../pages/Analytics";
import Admin from "../pages/Admin";
import Profile from "../pages/Profile";
import FieldReportPage from "../pages/FieldReport";

const router = createBrowserRouter([
  // Public routes
  { path: "/login",  element: <Login /> },
  { path: "/signup", element: <Signup /> },

  // All protected routes live inside AppShell
  {
    path: "/",
    element: (
      <PrivateRoute>
        <AppShell />
      </PrivateRoute>
    ),
    children: [
      { index: true,              element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard",        element: <Dashboard /> },
      { path: "map",              element: <MapView /> },
      { path: "zones/:id",        element: <ZoneDetails /> },
      { path: "alerts",           element: <Alerts /> },
      { path: "crack-reports",    element: <CrackReports /> },
      { path: "reports",          element: <Reports /> },
      { path: "analytics",        element: <Analytics /> },
      { path: "profile",          element: <Profile /> },
      { path:"field-report",      element: <FieldReportPage/>},

      // Admin-only — any non-admin hitting /admin gets redirected to /dashboard
      {
        path: "admin",
        element: (
          <PrivateRoute requiredRole="admin">
            <Admin />
          </PrivateRoute>
        ),
      },
    ],
  },
]);

export default router;
