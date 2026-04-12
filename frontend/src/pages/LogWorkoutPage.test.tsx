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
const workoutGetLastUsedValuesMock = vi.fn();

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
    getLastUsedValues: (...args: unknown[]) => workoutGetLastUsedValuesMock(...args),
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

function renderRepeatMode() {
  return render(
    <MemoryRouter initialEntries={["/log?repeat=workout-1"]}>
      <Routes>
        <Route path="/log" element={<LogWorkoutPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderTemplateMode() {
  return render(
    <MemoryRouter initialEntries={["/log?template_id=template-1"]}>
      <Routes>
        <Route path="/log" element={<LogWorkoutPage />} />
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
    workoutGetLastUsedValuesMock.mockReset();

    exerciseGetAllMock.mockResolvedValue(exercisesFixture);
    templateGetAllMock.mockResolvedValue([]);
    templateGetByIdMock.mockResolvedValue(null);
    templateCreateMock.mockResolvedValue("template-1");
    workoutCreateMock.mockResolvedValue("workout-1");
    workoutUpdateMock.mockResolvedValue(undefined);
    workoutGetByIdMock.mockResolvedValue(null);
    workoutGetLastUsedValuesMock.mockResolvedValue({});
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

  it("prefills a repeated workout from a previous session", async () => {
    workoutGetByIdMock.mockResolvedValueOnce({
      _id: "workout-1",
      user_identifier: "user-1",
      date_of_workout: "2026-04-10T08:00:00.000Z",
      target_muscle_groups: ["Push"],
      exercises: [
        {
          exercise_name: "Bench Press",
          exercise_definition_identifier: "exercise-1",
          sets: [
            { repetitions: 8, weight_in_kilograms: 80, rate_of_perceived_exertion: 8 },
          ],
        },
      ],
    });

    renderRepeatMode();

    await waitFor(() => {
      expect(workoutGetByIdMock).toHaveBeenCalledWith("workout-1");
    });

    expect(await screen.findByText(/bench press/i)).toBeInTheDocument();
    expect(screen.getByText(/loaded a previous workout to repeat/i)).toBeInTheDocument();
  });

  it("prefills from a template id query parameter", async () => {
    templateGetByIdMock.mockResolvedValueOnce({
      _id: "template-1",
      user_identifier: "user-1",
      template_name: "Push Day",
      target_muscle_groups: ["Push"],
      exercises: [
        {
          exercise_name: "Bench Press",
          exercise_definition_identifier: "exercise-1",
          sets: [{ repetitions: 8, weight_in_kilograms: 80, rate_of_perceived_exertion: 8 }],
        },
      ],
      created_at: "2026-04-10T10:00:00.000Z",
    });

    renderTemplateMode();

    await waitFor(() => {
      expect(templateGetByIdMock).toHaveBeenCalledWith("template-1");
    });

    expect(await screen.findByText(/bench press/i)).toBeInTheDocument();
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

  it("applies last-used set values with one tap", async () => {
    workoutGetLastUsedValuesMock.mockResolvedValue({
      "Bench Press": {
        repetitions: 6,
        weight_in_kilograms: 92.5,
        rate_of_perceived_exertion: 9,
      },
    });

    renderCreateMode();

    await waitFor(() => {
      expect(exerciseGetAllMock).toHaveBeenCalledTimes(1);
      expect(workoutGetLastUsedValuesMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }));
    fireEvent.click(await screen.findByRole("button", { name: /bench press/i }));

    fireEvent.click(screen.getByRole("button", { name: /use last for bench press/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("92.5")).toBeInTheDocument();
      expect(screen.getByDisplayValue("6")).toBeInTheDocument();
      expect(screen.getByDisplayValue("9")).toBeInTheDocument();
    });
  });

  it("decreases weight and reps with floor limits", async () => {
    renderCreateMode();

    await waitFor(() => {
      expect(exerciseGetAllMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }));
    fireEvent.click(await screen.findByRole("button", { name: /bench press/i }));

    fireEvent.click(screen.getByRole("button", { name: /-2.5 kg all/i }));
    fireEvent.click(screen.getByRole("button", { name: /-1 rep all/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("17.5")).toBeInTheDocument();
      expect(screen.getByDisplayValue("7")).toBeInTheDocument();
    });

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /-2.5 kg all/i }));
    }
    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /-1 rep all/i }));
    }

    await waitFor(() => {
      expect(screen.getByDisplayValue("0")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    });
  });
});
