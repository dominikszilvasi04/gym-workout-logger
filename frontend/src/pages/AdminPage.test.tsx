import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminPage } from "./AdminPage";

const listUsersMock = vi.fn();
const listAuditLogsMock = vi.fn();
const deleteUserMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("../store/authStore", () => ({
  useAuthStore: (selector: (state: { logout: typeof logoutMock }) => unknown) =>
    selector({ logout: logoutMock }),
}));

vi.mock("../services/api", () => ({
  adminAPI: {
    listUsers: (...args: unknown[]) => listUsersMock(...args),
    listAuditLogs: (...args: unknown[]) => listAuditLogsMock(...args),
    deleteUser: (...args: unknown[]) => deleteUserMock(...args),
    deleteAllUsers: vi.fn(),
    exportData: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

describe("AdminPage", () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    listAuditLogsMock.mockReset();
    deleteUserMock.mockReset();
    logoutMock.mockReset();

    listUsersMock.mockResolvedValue([
      {
        _id: "user-1",
        email: "athlete@example.com",
        display_name: "Athlete",
        role: "user",
        auth_provider: "local",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    listAuditLogsMock.mockResolvedValue([
      {
        _id: "log-1",
        action: "admin_user_delete",
        actor_email: "admin@example.com",
        timestamp: "2026-04-12T10:00:00.000Z",
      },
    ]);

    deleteUserMock.mockResolvedValue({
      user_identifier: "user-1",
      deleted_workouts: 2,
      deleted_templates: 1,
      deleted_goals: 0,
    });
  });

  it("loads and displays admin users and audit logs", async () => {
    const testQueryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(listUsersMock).toHaveBeenCalledTimes(1);
      expect(listAuditLogsMock).toHaveBeenCalledWith(20);
    });

    expect(await screen.findByText(/user lifecycle controls/i)).toBeInTheDocument();
    expect(screen.getByText(/athlete@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/recent admin activity/i)).toBeInTheDocument();
  });

  it("deletes a user when deletion is confirmed", async () => {
    const testQueryClient = createTestQueryClient();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText(/athlete@example.com/i);

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteUserMock).toHaveBeenCalledWith("user-1");
    });

    confirmSpy.mockRestore();
  });
});
