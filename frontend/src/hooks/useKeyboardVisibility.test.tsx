import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardVisibility } from "./useKeyboardVisibility";

describe("useKeyboardVisibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns false when visualViewport is unavailable", () => {
    Object.defineProperty(window, "visualViewport", {
      value: undefined,
      configurable: true,
    });

    const { result } = renderHook(() => useKeyboardVisibility());
    expect(result.current).toBe(false);
  });

  it("tracks keyboard visibility from visualViewport resize events", async () => {
    const listeners: Record<string, (() => void) | undefined> = {};
    const visualViewport = {
      height: 820,
      offsetTop: 0,
      addEventListener: vi.fn((eventName: string, handler: () => void) => {
        listeners[eventName] = handler;
      }),
      removeEventListener: vi.fn(),
    } as unknown as VisualViewport;

    Object.defineProperty(window, "innerHeight", {
      value: 960,
      configurable: true,
    });
    Object.defineProperty(window, "visualViewport", {
      value: visualViewport,
      configurable: true,
    });

    const { result } = renderHook(() => useKeyboardVisibility());

    expect(result.current).toBe(false);
    expect(visualViewport.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(visualViewport.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));

    act(() => {
      (visualViewport as { height: number }).height = 700;
      listeners.resize?.();
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
