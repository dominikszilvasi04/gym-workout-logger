import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth, useFormSubmit } from "./useAuth";

const checkAuthMock = vi.fn();
const clearErrorMock = vi.fn();

let storeState = {
  user: { _id: "1", email: "user@example.com", created_at: "2026-04-01" },
  isAuthenticated: true,
  isLoading: false,
  error: "",
  checkAuth: checkAuthMock,
  clearError: clearErrorMock,
};

vi.mock("../store/authStore", () => ({
  useAuthStore: () => storeState,
}));

describe("useAuth", () => {
  beforeEach(() => {
    checkAuthMock.mockReset();
    clearErrorMock.mockReset();
    storeState = {
      user: { _id: "1", email: "user@example.com", created_at: "2026-04-01" },
      isAuthenticated: true,
      isLoading: false,
      error: "",
      checkAuth: checkAuthMock,
      clearError: clearErrorMock,
    };
  });

  it("invokes checkAuth on mount and returns auth state", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(checkAuthMock).toHaveBeenCalledTimes(1);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("user@example.com");
  });
});

describe("useFormSubmit", () => {
  it("handles successful submit", async () => {
    const submitter = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFormSubmit(submitter));

    await result.current.submit({ email: "ok@example.com" });

    expect(submitter).toHaveBeenCalledWith({ email: "ok@example.com" });
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("captures submit errors", async () => {
    const submitter = vi.fn().mockRejectedValue(new Error("Request failed"));
    const { result } = renderHook(() => useFormSubmit(submitter));

    await result.current.submit({ email: "fail@example.com" });

    await waitFor(() => {
      expect(result.current.error).toBe("Request failed");
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
