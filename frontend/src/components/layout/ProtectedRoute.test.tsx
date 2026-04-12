import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

let authState = {
  isAuthenticated: false,
  isLoading: false,
};

vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState = {
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it("renders loading shell while auth is resolving", () => {
    authState = { isAuthenticated: false, isLoading: true };

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
    authState = { isAuthenticated: true, isLoading: false };

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/secret/i)).toBeInTheDocument();
  });
});
