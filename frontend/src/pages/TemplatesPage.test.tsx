import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplatesPage } from "./TemplatesPage";
import type { WorkoutTemplate } from "../types";

const getAllMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../services/api", () => ({
  templateAPI: {
    getAll: (...args: unknown[]) => getAllMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

const templatesFixture: WorkoutTemplate[] = [
  {
    _id: "template-1",
    user_identifier: "user-1",
    template_name: "Push Day",
    target_muscle_groups: ["Push", "Upper body"],
    exercises: [
      {
        exercise_name: "Bench Press",
        sets: [{ repetitions: 8, weight_in_kilograms: 80, rate_of_perceived_exertion: 8 }],
      },
    ],
    created_at: "2026-04-10T10:00:00.000Z",
  },
];

describe("TemplatesPage", () => {
  beforeEach(() => {
    getAllMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();

    getAllMock.mockResolvedValue(templatesFixture);
    updateMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);
  });

  it("loads and displays template cards", async () => {
    render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/push day/i)).toBeInTheDocument();
    expect(screen.getByText(/saved routines/i)).toBeInTheDocument();
    expect(screen.getByText(/1 exercises/i)).toBeInTheDocument();
  });

  it("renames a template", async () => {
    render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    );

    await screen.findByText(/push day/i);

    fireEvent.click(screen.getByRole("button", { name: /rename/i }));

    fireEvent.change(screen.getByLabelText(/template name/i), {
      target: { value: "Push Day - Updated" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save name/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        "template-1",
        expect.objectContaining({ template_name: "Push Day - Updated" })
      );
    });
  });

  it("deletes a template", async () => {
    render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    );

    await screen.findByText(/push day/i);

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete template/i }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith("template-1");
    });
  });
});
