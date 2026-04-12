import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { LoginPage } from "./LoginPage";

const loginMock = vi.fn();
const clearErrorMock = vi.fn();

let authState = {
  login: loginMock,
  isLoading: false,
  error: "",
  clearError: clearErrorMock,
};

vi.mock("../store/authStore", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock("../services/api", () => ({
  authAPI: {
    getGoogleLoginUrl: () => "/login/google",
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    clearErrorMock.mockReset();
    authState = {
      login: loginMock,
      isLoading: false,
      error: "",
      clearError: clearErrorMock,
    };
  });

  it("shows validation message when fields are empty", async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByText(/please fill in both fields/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("submits credentials when form is complete", async () => {
    loginMock.mockResolvedValueOnce({ _id: "1" });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("user@example.com", "password123");
    });
  });

  it("renders authentication error from store", () => {
    authState = {
      ...authState,
      error: "Invalid credentials",
    };

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
