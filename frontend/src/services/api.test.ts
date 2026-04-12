import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, axiosCreateMock, axiosIsAxiosErrorMock } = vi.hoisted(() => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    mockClient: client,
    axiosCreateMock: vi.fn(() => client),
    axiosIsAxiosErrorMock: vi.fn((error: unknown) =>
      Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
    ),
  };
});

vi.mock("axios", () => {
  return {
    default: {
      create: axiosCreateMock,
      isAxiosError: axiosIsAxiosErrorMock,
    },
    create: axiosCreateMock,
    isAxiosError: axiosIsAxiosErrorMock,
  };
});

import {
  authAPI,
  clearCachedCsrfToken,
  exerciseAPI,
  healthAPI,
  templateAPI,
  workoutAPI,
} from "./api";

describe("api service layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedCsrfToken();
  });

  it("registers axios interceptors on client creation", async () => {
    vi.resetModules();
    axiosCreateMock.mockClear();
    mockClient.interceptors.request.use.mockClear();
    mockClient.interceptors.response.use.mockClear();

    await import("./api");

    expect(axiosCreateMock).toHaveBeenCalledTimes(1);
    expect(mockClient.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockClient.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  it("auth API calls expected endpoints", async () => {
    mockClient.get.mockResolvedValueOnce({ data: { _id: "1", email: "x@example.com" } });
    mockClient.post.mockResolvedValueOnce({ data: { _id: "1", email: "x@example.com" } });
    mockClient.post.mockResolvedValueOnce({ data: { _id: "2", email: "y@example.com" } });
    mockClient.post.mockResolvedValueOnce({ data: {} });

    expect(authAPI.getGoogleLoginUrl()).toContain("/login/google");

    const current = await authAPI.getCurrentUser();
    expect(current._id).toBe("1");

    const loggedIn = await authAPI.login("x@example.com", "password");
    expect(loggedIn.email).toBe("x@example.com");

    const registered = await authAPI.register("y@example.com", "password", "Y");
    expect(registered._id).toBe("2");

    await authAPI.logout();

    expect(mockClient.get).toHaveBeenCalledWith("/api/auth/me");
    expect(mockClient.post).toHaveBeenNthCalledWith(1, "/login", { email: "x@example.com", password: "password" });
    expect(mockClient.post).toHaveBeenNthCalledWith(2, "/register", {
      email: "y@example.com",
      password: "password",
      display_name: "Y",
    });
    expect(mockClient.post).toHaveBeenNthCalledWith(3, "/logout");
  });

  it("exercise API returns catalogue and submits requests", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [{ _id: "e1" }] });
    mockClient.post.mockResolvedValueOnce({ data: { message: "ok" } });

    const exercises = await exerciseAPI.getAll();
    const response = await exerciseAPI.requestNew("Hip Thrust", "Glutes", "me@example.com", "please add");

    expect(exercises).toHaveLength(1);
    expect(response.message).toBe("ok");
    expect(mockClient.post).toHaveBeenCalledWith("/api/exercises/requests", {
      requester_email: "me@example.com",
      exercise_name: "Hip Thrust",
      primary_muscle_group: "Glutes",
      notes: "please add",
    });
  });

  it("workout API covers list/detail/last/analytics/template init paths", async () => {
    mockClient.get
      .mockResolvedValueOnce({ data: { workouts: [{ _id: "w1" }], total: 1 } })
      .mockResolvedValueOnce({ data: { _id: "w1" } })
      .mockResolvedValueOnce({ data: { _id: "w-last" } })
      .mockResolvedValueOnce({ data: { last_used_values: { Bench: { repetitions: 8 } } } })
      .mockResolvedValueOnce({ data: { summary: { total_workouts: 1 } } })
      .mockResolvedValueOnce({ data: { exercises: [], templates: [], recent_workouts: [], user: { _id: "u1" } } });

    const list = await workoutAPI.getAll(1, 20, "date_of_workout", "desc");
    const detail = await workoutAPI.getById("w1");
    const last = await workoutAPI.getLast();
    const lastUsed = await workoutAPI.getLastUsedValues();
    const analytics = await workoutAPI.getAnalytics(30, "Bench Press");
    const initData = await workoutAPI.initDashboard();

    expect(list.total).toBe(1);
    expect(detail._id).toBe("w1");
    expect(last?._id).toBe("w-last");
    expect(lastUsed.Bench).toBeTruthy();
    expect((analytics as { summary?: { total_workouts?: number } }).summary?.total_workouts).toBe(1);
    expect(initData.user._id).toBe("u1");

    expect(mockClient.get).toHaveBeenCalledWith("/api/workouts", {
      params: { page: 1, limit: 20, sort: "date_of_workout", order: "desc" },
    });
    expect(mockClient.get).toHaveBeenCalledWith("/api/workouts/w1");
    expect(mockClient.get).toHaveBeenCalledWith("/api/workouts/last");
    expect(mockClient.get).toHaveBeenCalledWith("/api/workouts/last-used-values");
    expect(mockClient.get).toHaveBeenCalledWith("/api/dashboard/analytics", {
      params: { range_days: 30, exercise_name: "Bench Press" },
    });
    expect(mockClient.get).toHaveBeenCalledWith("/api/dashboard/init");
  });

  it("workout create retries on csrf error and handles last-workout fallback", async () => {
    mockClient.post
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { error: "CSRF token invalid" } },
      })
      .mockResolvedValueOnce({ data: { identifier: "retry-id" } });

    const identifier = await workoutAPI.create({
      date_of_workout: "2026-04-12T12:00",
      target_muscle_groups: ["Push"],
      exercises: [],
    });

    expect(identifier).toBe("retry-id");
    expect(mockClient.post).toHaveBeenCalledTimes(2);

    mockClient.get.mockRejectedValueOnce(new Error("not found"));
    const last = await workoutAPI.getLast();
    expect(last).toBeNull();
  });

  it("workout/template mutation endpoints and health check", async () => {
    mockClient.put.mockResolvedValueOnce({ data: {} });
    mockClient.delete.mockResolvedValueOnce({ data: {} });
    mockClient.get.mockResolvedValueOnce({ data: [{ _id: "t1" }] });
    mockClient.get.mockResolvedValueOnce({ data: { _id: "t1" } });
    mockClient.post.mockResolvedValueOnce({ data: { identifier: "new-template" } });
    mockClient.put.mockResolvedValueOnce({ data: {} });
    mockClient.delete.mockResolvedValueOnce({ data: {} });
    mockClient.get.mockResolvedValueOnce({ data: { status: "ok" } });

    await workoutAPI.update("w1", {
      date_of_workout: "2026-04-10T10:00",
      target_muscle_groups: ["Push"],
      exercises: [],
    });
    await workoutAPI.delete("w1");

    const templates = await templateAPI.getAll();
    const template = await templateAPI.getById("t1");
    const created = await templateAPI.create({
      template_name: "A",
      target_muscle_groups: ["Push"],
      exercises: [],
    });
    await templateAPI.update("t1", {
      template_name: "B",
      target_muscle_groups: ["Pull"],
      exercises: [],
    });
    await templateAPI.delete("t1");

    const health = await healthAPI.check();

    expect(templates).toHaveLength(1);
    expect(template._id).toBe("t1");
    expect(created).toBe("new-template");
    expect(health.status).toBe("ok");
  });
});
