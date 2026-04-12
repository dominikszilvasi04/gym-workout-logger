import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import type { AnalyticsData, Workout } from "../types";

const getAnalyticsMock = vi.fn();
const getAllMock = vi.fn();

vi.mock("../services/api", () => ({
  workoutAPI: {
    getAnalytics: (...args: unknown[]) => getAnalyticsMock(...args),
    getAll: (...args: unknown[]) => getAllMock(...args),
  },
}));

const analyticsFixture: AnalyticsData = {
  filters: { range_days: 30, available_exercises: [] },
  summary: {
    total_workouts: 5,
    total_volume: 12345,
    average_workout_volume: 2469,
    total_sets: 32,
    total_repetitions: 210,
    total_exercises: 18,
    strongest_estimated_one_rep_maximum: 140,
    average_session_rpe: 7.4,
    current_training_streak_weeks: 3,
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
    target_muscle_groups: ["Push", "Upper body"],
    exercises: [
      {
        exercise_name: "Bench Press",
        sets: [
          { repetitions: 8, weight_in_kilograms: 80, rate_of_perceived_exertion: 8 },
          { repetitions: 6, weight_in_kilograms: 85, rate_of_perceived_exertion: 9 },
        ],
      },
    ],
  },
];

describe("DashboardPage", () => {
  beforeEach(() => {
    getAnalyticsMock.mockReset();
    getAllMock.mockReset();
    getAnalyticsMock.mockResolvedValue(analyticsFixture);
    getAllMock.mockResolvedValue({ workouts: workoutsFixture, total: workoutsFixture.length });
  });

  it("loads analytics and recent sessions", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnalyticsMock).toHaveBeenCalledWith(30);
      expect(getAllMock).toHaveBeenCalledWith(1, 10);
    });

    expect(await screen.findByText(/today cockpit/i)).toBeInTheDocument();
    expect(screen.getByText(/one-handed logging, clear momentum/i)).toBeInTheDocument();
    expect(screen.getByText(/repeat last/i)).toBeInTheDocument();
    expect(screen.getByText(/deep analysis/i)).toBeInTheDocument();
    expect(screen.getByText("7.4")).toBeInTheDocument();
    expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/^push$/i)).toBeInTheDocument();
  });
});
