import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

let authState = {
  isAuthenticated: false,
  isLoading: false,
  user: null as null | { role?: "user" | "admin"; is_admin?: boolean },
};

vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
    };
  });

  it("renders loading shell while auth is resolving", () => {
    authState = { isAuthenticated: false, isLoading: true, user: null };

    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("redirects unauthenticated users to login", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Secret</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/login screen/i)).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    authState = { isAuthenticated: true, isLoading: false, user: { role: "user" } };

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/secret/i)).toBeInTheDocument();
  });

  it("redirects authenticated non-admin users away from admin routes", () => {
    authState = { isAuthenticated: true, isLoading: false, user: { role: "user" } };

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <div>Admin Secret</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>Home Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/home screen/i)).toBeInTheDocument();
  });

  it("renders admin route children for users with is_admin", () => {
    authState = { isAuthenticated: true, isLoading: false, user: { is_admin: true } };

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin">
          <div>Admin Secret</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/admin secret/i)).toBeInTheDocument();
  });
});
