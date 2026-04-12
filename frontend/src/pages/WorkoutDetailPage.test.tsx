import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkoutDetailPage } from "./WorkoutDetailPage";
import type { Workout } from "../types";

const getByIdMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../services/api", () => ({
  workoutAPI: {
    getById: (...args: unknown[]) => getByIdMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

const workoutFixture: Workout = {
  _id: "workout-1",
  user_identifier: "user-1",
  date_of_workout: "2026-04-10T08:00:00.000Z",
  target_muscle_groups: ["Push", "Upper body"],
  exercises: [
    {
      exercise_name: "Bench Press",
      sets: [
        { repetitions: 8, weight_in_kilograms: 80, rate_of_perceived_exertion: 8 },
        { repetitions: 6, weight_in_kilograms: 85 },
      ],
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/workouts/workout-1"]}>
      <Routes>
        <Route path="/workouts/:workoutId" element={<WorkoutDetailPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("WorkoutDetailPage", () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    deleteMock.mockReset();
    getByIdMock.mockResolvedValue(workoutFixture);
    deleteMock.mockResolvedValue(undefined);
  });

  it("loads and renders workout details including optional RPE placeholder", async () => {
    renderPage();

    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith("workout-1");
    });

    expect(await screen.findByText(/session details/i)).toBeInTheDocument();
    expect(screen.getByText(/bench press/i)).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("opens delete dialog and confirms delete", async () => {
    renderPage();

    await screen.findByText(/session details/i);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByRole("heading", { name: /delete workout/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^delete workout$/i }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith("workout-1");
    });
  });
});
