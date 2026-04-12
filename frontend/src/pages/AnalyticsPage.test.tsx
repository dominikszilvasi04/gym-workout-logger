import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsPage } from "./AnalyticsPage";
import type { AnalyticsData } from "../types";

const getAnalyticsMock = vi.fn();

vi.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />,
}));

vi.mock("../services/api", () => ({
  workoutAPI: {
    getAnalytics: (...args: unknown[]) => getAnalyticsMock(...args),
  },
}));

const analyticsFixture: AnalyticsData = {
  filters: { range_days: 30, available_exercises: ["Bench Press"] },
  summary: {
    total_workouts: 8,
    total_volume: 18400,
    average_workout_volume: 2300,
    total_sets: 58,
    total_repetitions: 322,
    total_exercises: 41,
    strongest_estimated_one_rep_maximum: 150,
    average_session_rpe: 7.2,
    current_training_streak_weeks: 4,
  },
  charts: {
    one_rep_max_progression: { labels: ["W1"], values: [120] },
    workout_volume_progression: { labels: ["W1"], values: [2000] },
    muscle_group_distribution: { labels: ["Push", "Pull"], values: [4, 4] },
    weekly_frequency: { labels: ["W1"], values: [3] },
    average_rpe_progression: { labels: ["W1"], values: [7.1] },
    top_exercise_volume: { labels: ["Bench Press"], values: [4000] },
  },
  leaderboards: {
    personal_records: [
      { exercise_name: "Bench Press", estimated_one_rep_maximum: 120, date: "2026-04-01T10:00:00.000Z" },
    ],
  },
};

describe("AnalyticsPage", () => {
  beforeEach(() => {
    getAnalyticsMock.mockReset();
    getAnalyticsMock.mockResolvedValue(analyticsFixture);
  });

  it("renders analytics sections and chart placeholders", async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnalyticsMock).toHaveBeenCalledWith(30);
    });

    expect(await screen.findByText(/training trends/i)).toBeInTheDocument();
    expect(screen.getByText(/estimated one repetition maximum/i)).toBeInTheDocument();
    expect(screen.getByText(/top exercise volume/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("line-chart").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("doughnut-chart").length).toBeGreaterThan(0);
  });

  it("requests new range when user selects another tab", async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    await screen.findByText(/training trends/i);

    fireEvent.click(screen.getByRole("button", { name: "7 days" }));

    await waitFor(() => {
      expect(getAnalyticsMock).toHaveBeenCalledWith(7);
    });
  });
});
