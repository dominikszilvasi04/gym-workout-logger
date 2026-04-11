import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface ProtectedRouteProperties {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProperties) {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.isLoading);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-navy-200 bg-white p-5 shadow-sm">
          <div className="h-24 animate-pulse rounded-xl bg-navy-100" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
