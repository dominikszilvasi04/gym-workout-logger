import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";

const registerMock = vi.fn();
const clearErrorMock = vi.fn();

let authState = {
  register: registerMock,
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

describe("RegisterPage", () => {
  beforeEach(() => {
    registerMock.mockReset();
    clearErrorMock.mockReset();
    authState = {
      register: registerMock,
      isLoading: false,
      error: "",
      clearError: clearErrorMock,
    };
  });

  it("shows password strength helper copy", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "abcdefgh" },
    });

    expect(screen.getByText(/password strength: improving/i)).toBeInTheDocument();
  });

  it("submits registration with entered values", async () => {
    registerMock.mockResolvedValueOnce({ _id: "1" });

    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Domin" },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "domin@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "StrongPass1234" },
    });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("domin@example.com", "StrongPass1234", "Domin");
    });
  });

  it("shows backend registration error", () => {
    authState = {
      ...authState,
      error: "Email already used",
    };

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/email already used/i)).toBeInTheDocument();
  });
});
