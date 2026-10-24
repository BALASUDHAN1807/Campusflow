import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { StudentLayout } from "./layouts/StudentLayout";
import { StudentDashboardPage } from "./pages/StudentDashboardPage";
import { StudentQueuePage } from "./pages/StudentQueuePage";
import { StudentNotificationsPage } from "./pages/StudentNotificationsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { StaffLayout } from "./layouts/StaffLayout";
import { StaffDashboardPage } from "./pages/StaffDashboardPage";
import { StaffQueuePage } from "./pages/StaffQueuePage";
import { StaffEventsPage } from "./pages/StaffEventsPage";
import { StaffAnalyticsPage } from "./pages/StaffAnalyticsPage";
import { FairnessSimulatorPage } from "./pages/FairnessSimulatorPage";
import { StaffSettingsPage } from "./pages/StaffSettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useAuthStore } from "./store/authStore";

export function App() {
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    // Initial session check on mount
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Student Portal Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["STUDENT"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboardPage />} />
          <Route path="queue" element={<StudentQueuePage />} />
          <Route path="notifications" element={<StudentNotificationsPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>

        {/* Protected Staff Operations Routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffDashboardPage />} />
          <Route path="queue" element={<StaffQueuePage />} />
          <Route path="events" element={<StaffEventsPage />} />
          <Route path="analytics" element={<StaffAnalyticsPage />} />
          <Route path="simulator" element={<FairnessSimulatorPage />} />
          <Route path="settings" element={<StaffSettingsPage />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
