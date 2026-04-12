import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InputField } from "./InputField";

describe("InputField", () => {
  it("renders label and helper text", () => {
    render(<InputField label="Email" helperText="Used for login" />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/used for login/i)).toBeInTheDocument();
  });

  it("renders error message when provided", () => {
    render(<InputField label="Password" errorMessage="Required" />);

    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
});
