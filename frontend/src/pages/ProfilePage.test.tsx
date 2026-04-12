import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";
import type { AnalyticsData, Workout } from "../types";

const getAnalyticsMock = vi.fn();
const getAllMock = vi.fn();
const getLastMock = vi.fn();
const logoutMock = vi.fn();
const updateProfileMock = vi.fn();

let authState = {
  logout: logoutMock,
  updateProfile: updateProfileMock,
  user: {
    _id: "user-1",
    email: "profile.user@example.com",
    display_name: "Profile User",
    created_at: "2026-01-01T09:00:00.000Z",
  },
};

vi.mock("../store/authStore", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock("../services/api", () => ({
  workoutAPI: {
    getAnalytics: (...args: unknown[]) => getAnalyticsMock(...args),
    getAll: (...args: unknown[]) => getAllMock(...args),
    getLast: (...args: unknown[]) => getLastMock(...args),
  },
}));

const analyticsFixture: AnalyticsData = {
  filters: { range_days: 90, available_exercises: [] },
  summary: {
    total_workouts: 9,
    total_volume: 18600,
    average_workout_volume: 2067,
    total_sets: 60,
    total_repetitions: 330,
    total_exercises: 45,
    strongest_estimated_one_rep_maximum: 155,
    average_session_rpe: 7.3,
    current_training_streak_weeks: 5,
  },
  charts: {
    one_rep_max_progression: { labels: [], values: [] },
    workout_volume_progression: { labels: [], values: [] },
    muscle_group_distribution: { labels: [], values: [] },
    weekly_frequency: { labels: [], values: [] },
    average_rpe_progression: { labels: [], values: [] },
    top_exercise_volume: { labels: [], values: [] },
  },
  leaderboards: { personal_records: [] },
};

const workoutsFixture: Workout[] = [
  {
    _id: "workout-1",
    user_identifier: "user-1",
    date_of_workout: "2026-04-10T10:00:00.000Z",
    target_muscle_groups: ["Pull", "Back"],
    exercises: [
      {
        exercise_name: "Row",
        sets: [{ repetitions: 10, weight_in_kilograms: 60, rate_of_perceived_exertion: 8 }],
      },
    ],
  },
];

describe("ProfilePage", () => {
  beforeEach(() => {
    getAnalyticsMock.mockReset();
    getAllMock.mockReset();
    getLastMock.mockReset();
    logoutMock.mockReset();
    updateProfileMock.mockReset();

    authState = {
      logout: logoutMock,
      updateProfile: updateProfileMock,
      user: {
        _id: "user-1",
        email: "profile.user@example.com",
        display_name: "Profile User",
        created_at: "2026-01-01T09:00:00.000Z",
      },
    };

    getAnalyticsMock.mockResolvedValue(analyticsFixture);
    getAllMock.mockResolvedValue({ workouts: workoutsFixture, total: workoutsFixture.length });
    getLastMock.mockResolvedValue(workoutsFixture[0]);
    logoutMock.mockResolvedValue(undefined);
    updateProfileMock.mockResolvedValue(undefined);
  });

  it("renders profile metrics, repeat action, and editable display name", async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnalyticsMock).toHaveBeenCalledWith(90);
      expect(getAllMock).toHaveBeenCalledWith(1, 6);
      expect(getLastMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/athlete ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/one repetition maximum/i)).toBeInTheDocument();
    expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Coach Dom" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith("Coach Dom");
    });

    expect(screen.getByRole("button", { name: /repeat last/i })).toBeEnabled();
  });

  it("logs user out", async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await screen.findByText(/athlete ledger/i);

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
