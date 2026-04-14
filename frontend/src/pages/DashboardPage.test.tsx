import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "./DashboardPage";
import type { AnalyticsData, ExerciseGoalProgress, Workout } from "../types";

const getAnalyticsMock = vi.fn();
const getAllMock = vi.fn();
const getGoalsMock = vi.fn();
const getExercisesMock = vi.fn();
const createGoalMock = vi.fn();
const updateGoalMock = vi.fn();
const deleteGoalMock = vi.fn();
const deleteWorkoutMock = vi.fn();
const navigateMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock("../services/api", () => ({
  exerciseAPI: {
    getAll: (...args: unknown[]) => getExercisesMock(...args),
  },
  goalAPI: {
    getAll: (...args: unknown[]) => getGoalsMock(...args),
    create: (...args: unknown[]) => createGoalMock(...args),
    update: (...args: unknown[]) => updateGoalMock(...args),
    delete: (...args: unknown[]) => deleteGoalMock(...args),
  },
  workoutAPI: {
    getAnalytics: (...args: unknown[]) => getAnalyticsMock(...args),
    getAll: (...args: unknown[]) => getAllMock(...args),
    delete: (...args: unknown[]) => deleteWorkoutMock(...args),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
    }),
  };
});

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

const goalsFixture: ExerciseGoalProgress[] = [
  {
    _id: "goal-1",
    exercise_name: "Bench Press",
    exercise_definition_identifier: "exercise-1",
    target_weight_in_kilograms: 100,
    target_repetitions: 5,
    target_date: "2026-05-01",
    target_estimated_one_rep_maximum: 116.7,
    current_best_estimated_one_rep_maximum: 104.2,
    progress_percentage: 48,
    is_achieved: false,
  },
  {
    _id: "goal-2",
    exercise_name: "Squat",
    exercise_definition_identifier: "exercise-2",
    target_weight_in_kilograms: 140,
    target_repetitions: 3,
    target_date: "2026-06-01",
    target_estimated_one_rep_maximum: 153.3,
    current_best_estimated_one_rep_maximum: 153.3,
    progress_percentage: 100,
    is_achieved: true,
  },
];

const exerciseDefinitionsFixture = [
  { _id: "exercise-1", exercise_name: "Bench Press" },
  { _id: "exercise-2", exercise_name: "Squat" },
];

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
  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  beforeEach(() => {
    getAnalyticsMock.mockReset();
    getAllMock.mockReset();
    getGoalsMock.mockReset();
    getExercisesMock.mockReset();
    createGoalMock.mockReset();
    updateGoalMock.mockReset();
    deleteGoalMock.mockReset();
    deleteWorkoutMock.mockReset();
    navigateMock.mockReset();
    invalidateQueriesMock.mockReset();
    getAnalyticsMock.mockResolvedValue(analyticsFixture);
    getAllMock.mockResolvedValue({ workouts: workoutsFixture, total: workoutsFixture.length });
    getGoalsMock.mockResolvedValue(goalsFixture);
    getExercisesMock.mockResolvedValue(exerciseDefinitionsFixture);
    createGoalMock.mockResolvedValue({ identifier: "goal-3" });
    updateGoalMock.mockResolvedValue({});
    deleteGoalMock.mockResolvedValue({});
    deleteWorkoutMock.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads dashboard data, navigates, filters goals, and deletes sessions", async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(getAnalyticsMock).toHaveBeenCalledWith(30);
      expect(getAllMock).toHaveBeenCalledWith(1, 10);
      expect(getGoalsMock).toHaveBeenCalled();
      expect(getExercisesMock).toHaveBeenCalled();
    });

    expect(await screen.findByText(/today cockpit/i)).toBeInTheDocument();
    expect(screen.getByText(/fast logging\. clear progress\./i)).toBeInTheDocument();
    expect(screen.getByText(/repeat last/i)).toBeInTheDocument();
    expect(screen.getByText(/deep analysis/i)).toBeInTheDocument();
    expect(screen.getByText("7.4")).toBeInTheDocument();
    expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /7 days/i }));
    await waitFor(() => {
      expect(getAnalyticsMock).toHaveBeenLastCalledWith(7);
    });

    fireEvent.click(screen.getByRole("button", { name: /90 days/i }));
    await waitFor(() => {
      expect(getAnalyticsMock).toHaveBeenLastCalledWith(90);
    });

    fireEvent.click(screen.getByRole("button", { name: /repeat last/i }));
    fireEvent.click(screen.getByRole("button", { name: /templates/i }));
    fireEvent.click(screen.getByRole("button", { name: /deep analysis/i }));
    expect(navigateMock).toHaveBeenNthCalledWith(1, "/log?source=last");
    expect(navigateMock).toHaveBeenNthCalledWith(2, "/templates");
    expect(navigateMock).toHaveBeenNthCalledWith(3, "/analytics");

    fireEvent.click(screen.getByRole("button", { name: /achieved/i }));
    expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /in progress/i }));
    expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(1);

    const workoutDeleteButton = screen.getAllByRole("button", { name: /^delete$/i }).at(-1);
    expect(workoutDeleteButton).toBeDefined();
    fireEvent.click(workoutDeleteButton as HTMLElement);

    await waitFor(() => {
      expect(deleteWorkoutMock).toHaveBeenCalledWith("workout-1");
      expect(invalidateQueriesMock).toHaveBeenCalled();
    });

    expect(await screen.findByText(/workout deleted\./i)).toBeInTheDocument();
  });

  it("creates, edits, and deletes goals", async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText(/goal progress/i);

    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));
    expect(await screen.findByText(/select an exercise and complete all required target fields/i)).toBeInTheDocument();
    expect(createGoalMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByDisplayValue("Select exercise"), { target: { value: "exercise-1" } });
    fireEvent.change(screen.getByPlaceholderText(/weight kg/i), { target: { value: "120" } });
    fireEvent.change(screen.getByPlaceholderText(/reps/i), { target: { value: "5" } });
    const createGoalDateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null;
    expect(createGoalDateInput).not.toBeNull();
    fireEvent.change(createGoalDateInput as HTMLInputElement, { target: { value: "2026-05-10" } });

    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() => {
      expect(createGoalMock).toHaveBeenCalledWith({
        exercise_name: "Bench Press",
        exercise_definition_identifier: "exercise-1",
        target_weight_in_kilograms: 120,
        target_repetitions: 5,
        target_date: "2026-05-10",
      });
    });

    expect(await screen.findByText(/goal saved\./i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);

    const editInputs = screen.getAllByRole("spinbutton").slice(-2);
    fireEvent.change(editInputs[0], { target: { value: "105" } });
    fireEvent.change(editInputs[1], { target: { value: "6" } });

    fireEvent.click(screen.getAllByRole("button", { name: /^save$/i })[0]);

    await waitFor(() => {
      expect(updateGoalMock).toHaveBeenCalledWith("goal-1", expect.objectContaining({
        target_weight_in_kilograms: 105,
        target_repetitions: 6,
      }));
    });

    const deleteButtons = screen.getAllByRole("button", { name: /^delete$/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteGoalMock).toHaveBeenCalledWith("goal-1");
    });

    expect(await screen.findByText(/goal deleted\./i)).toBeInTheDocument();
  });

  it("supports iOS date fallback and manual date normalization", async () => {
    const queryClient = createTestQueryClient();
    vi.stubGlobal("navigator", {
      userAgent: "iPhone",
      platform: "iPhone",
      maxTouchPoints: 2,
    } as unknown as Navigator);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText(/goal progress/i);

    const goalDateInput = screen.getAllByPlaceholderText(/yyyy-mm-dd/i)[0] as HTMLInputElement;
    expect(goalDateInput.type).toBe("text");

    fireEvent.change(goalDateInput, { target: { value: "2026051" } });
    expect(goalDateInput.value).toBe("2026-05-1");

    fireEvent.blur(goalDateInput);
    expect(await screen.findByText(/date format must be yyyy-mm-dd/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^today$/i }));
    expect(goalDateInput.value).toMatch(/\d{4}-\d{2}-\d{2}/);

    vi.unstubAllGlobals();
  });
});
