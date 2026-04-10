import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RegisterPage } from "./pages/RegisterPage";
import { useAuthStore } from "./store/authStore";

function App() {
  const checkAuthentication = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    void checkAuthentication();
  }, [checkAuthentication]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/log"
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title="Log workout"
                message="The new logging flow is being built next with exercise selection and set tracking optimised for phone use."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title="Analytics"
                message="The interactive analytics view is the next stage and will include drill down and clearer progress insights."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title="Templates"
                message="Template management will be redesigned here with fast one tap loading for your regular sessions."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title="Profile"
                message="Profile and account settings will be refreshed with cleaner hierarchy and clear data summaries."
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
