import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface ProtectedRouteProperties {
  children: ReactNode;
  requiredRole?: "admin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProperties) {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.is_admin || user?.role === "admin";

  if (loading) {
    return (
      <div className="app-min-h flex items-center justify-center bg-navy-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-navy-300/60 bg-navy-100 p-5 shadow-xl shadow-black/45">
          <div className="h-24 animate-pulse rounded-xl bg-navy-200" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
