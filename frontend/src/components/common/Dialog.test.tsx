import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  });

  it("returns null when closed", () => {
    const { container } = render(
      <Dialog open={false} title="Example" onClose={() => undefined}>
        <p>Body</p>
      </Dialog>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("calls onClose when escape is pressed", () => {
    const onClose = vi.fn();

    render(
      <Dialog open title="Example" onClose={onClose}>
        <button type="button">Action</button>
      </Dialog>
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scrolling while open", () => {
    render(
      <Dialog open title="Example" onClose={() => undefined}>
        <button type="button">Action</button>
      </Dialog>
    );

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.touchAction).toBe("none");
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();

    render(
      <Dialog open title="Example" onClose={onClose}>
        <button type="button">Action</button>
      </Dialog>
    );

    const dialog = screen.getByRole("dialog", { name: "Example" });
    fireEvent.mouseDown(dialog);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when content is clicked", () => {
    const onClose = vi.fn();

    render(
      <Dialog open title="Example" onClose={onClose}>
        <button type="button">Action</button>
      </Dialog>
    );

    fireEvent.mouseDown(screen.getByText("Action"));

    expect(onClose).not.toHaveBeenCalled();
  });
});
