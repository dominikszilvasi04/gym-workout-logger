import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const checkAuthMock = vi.fn();

let authState = {
  isAuthenticated: false,
  isLoading: false,
  checkAuth: checkAuthMock,
};

vi.mock("./store/authStore", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock("./pages/DashboardPage", () => ({ DashboardPage: () => <div>Dashboard Mock</div> }));
vi.mock("./pages/LogWorkoutPage", () => ({ LogWorkoutPage: () => <div>Log Mock</div> }));
vi.mock("./pages/AnalyticsPage", () => ({ AnalyticsPage: () => <div>Analytics Mock</div> }));
vi.mock("./pages/TemplatesPage", () => ({ TemplatesPage: () => <div>Templates Mock</div> }));
vi.mock("./pages/ProfilePage", () => ({ ProfilePage: () => <div>Profile Mock</div> }));
vi.mock("./pages/WorkoutDetailPage", () => ({ WorkoutDetailPage: () => <div>Workout Detail Mock</div> }));
vi.mock("./pages/LoginPage", () => ({ LoginPage: () => <div>Login Mock</div> }));
vi.mock("./pages/RegisterPage", () => ({ RegisterPage: () => <div>Register Mock</div> }));

describe("App routing", () => {
  beforeEach(() => {
    checkAuthMock.mockReset();
    authState = {
      isAuthenticated: false,
      isLoading: false,
      checkAuth: checkAuthMock,
    };
  });

  it("renders login route for unauthenticated users", async () => {
    window.history.pushState({}, "", "/login");

    render(<App />);

    expect(await screen.findByText(/login mock/i)).toBeInTheDocument();
    expect(checkAuthMock).toHaveBeenCalledTimes(1);
  });

  it("redirects authenticated users away from login", async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      checkAuth: checkAuthMock,
    };
    window.history.pushState({}, "", "/login");

    render(<App />);

    expect(await screen.findByText(/dashboard mock/i)).toBeInTheDocument();
  });

  it("renders loading shell while auth status is pending on public routes", async () => {
    authState = {
      isAuthenticated: false,
      isLoading: true,
      checkAuth: checkAuthMock,
    };
    window.history.pushState({}, "", "/login");

    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector(".animate-pulse")).not.toBeNull();
    });
  });
});
