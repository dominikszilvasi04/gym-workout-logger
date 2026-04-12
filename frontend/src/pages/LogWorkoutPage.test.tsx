import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogWorkoutPage } from "./LogWorkoutPage";
import type { ExerciseDefinition } from "../types";

const exerciseGetAllMock = vi.fn();
const templateGetAllMock = vi.fn();
const templateGetByIdMock = vi.fn();
const templateCreateMock = vi.fn();
const workoutCreateMock = vi.fn();
const workoutUpdateMock = vi.fn();
const workoutGetByIdMock = vi.fn();

vi.mock("../services/api", () => ({
  exerciseAPI: {
    getAll: (...args: unknown[]) => exerciseGetAllMock(...args),
  },
  templateAPI: {
    getAll: (...args: unknown[]) => templateGetAllMock(...args),
    getById: (...args: unknown[]) => templateGetByIdMock(...args),
    create: (...args: unknown[]) => templateCreateMock(...args),
  },
  workoutAPI: {
    create: (...args: unknown[]) => workoutCreateMock(...args),
    update: (...args: unknown[]) => workoutUpdateMock(...args),
    getById: (...args: unknown[]) => workoutGetByIdMock(...args),
  },
}));

const exercisesFixture: ExerciseDefinition[] = [
  {
    _id: "exercise-1",
    exercise_name: "Bench Press",
    primary_muscle_group: "Push",
    equipment_required: "Barbell",
  },
  {
    _id: "exercise-2",
    exercise_name: "Row",
    primary_muscle_group: "Back",
    equipment_required: "Machine",
  },
];

function renderCreateMode() {
  return render(
    <MemoryRouter initialEntries={["/log"]}>
      <Routes>
        <Route path="/log" element={<LogWorkoutPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEditMode() {
  return render(
    <MemoryRouter initialEntries={["/workouts/workout-1/edit"]}>
      <Routes>
        <Route path="/workouts/:workoutId/edit" element={<LogWorkoutPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LogWorkoutPage", () => {
  beforeEach(() => {
    exerciseGetAllMock.mockReset();
    templateGetAllMock.mockReset();
    templateGetByIdMock.mockReset();
    templateCreateMock.mockReset();
    workoutCreateMock.mockReset();
    workoutUpdateMock.mockReset();
    workoutGetByIdMock.mockReset();

    exerciseGetAllMock.mockResolvedValue(exercisesFixture);
    templateGetAllMock.mockResolvedValue([]);
    templateGetByIdMock.mockResolvedValue(null);
    templateCreateMock.mockResolvedValue("template-1");
    workoutCreateMock.mockResolvedValue("workout-1");
    workoutUpdateMock.mockResolvedValue(undefined);
    workoutGetByIdMock.mockResolvedValue(null);
  });

  it("loads catalogue and lets user add an exercise", async () => {
    renderCreateMode();

    await waitFor(() => {
      expect(exerciseGetAllMock).toHaveBeenCalledTimes(1);
      expect(templateGetAllMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }));

    const exerciseButton = await screen.findByRole("button", { name: /bench press/i });
    fireEvent.click(exerciseButton);

    expect(await screen.findByText(/bench press/i)).toBeInTheDocument();
    expect(screen.getByText(/1 sets/i)).toBeInTheDocument();
  });

  it("shows edit-load error when workout fetch fails", async () => {
    workoutGetByIdMock.mockRejectedValueOnce(new Error("boom"));

    renderEditMode();

    expect(await screen.findByText(/unable to load workout for editing/i)).toBeInTheDocument();
  });

  it("shows validation message when saving without exercises", async () => {
    renderCreateMode();

    await waitFor(() => {
      expect(exerciseGetAllMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText(/add at least one exercise before submitting/i)).toBeInTheDocument();
    expect(workoutCreateMock).not.toHaveBeenCalled();
  });

  it("creates workout successfully after adding an exercise", async () => {
    renderCreateMode();

    await waitFor(() => {
      expect(exerciseGetAllMock).toHaveBeenCalledTimes(1);
      expect(templateGetAllMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }));
    fireEvent.click(await screen.findByRole("button", { name: /bench press/i }));

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(workoutCreateMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/workout saved successfully/i)).toBeInTheDocument();
  });
});
