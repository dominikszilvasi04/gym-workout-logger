import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceholderPage } from "./PlaceholderPage";

describe("PlaceholderPage", () => {
  it("renders title and message", () => {
    render(
      <MemoryRouter>
        <PlaceholderPage title="Soon" message="Feature coming soon" />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /soon/i })).toBeInTheDocument();
    expect(screen.getByText(/feature coming soon/i)).toBeInTheDocument();
  });
});
