import { describe, expect, it } from "vitest";
import { createApplicationQueryClient } from "./queryClient";

describe("createApplicationQueryClient", () => {
  it("configures the expected default query and mutation options", () => {
    const queryClient = createApplicationQueryClient();
    const defaultOptions = queryClient.getDefaultOptions();

    expect(defaultOptions.queries).toMatchObject({
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    });

    expect(defaultOptions.mutations).toMatchObject({
      retry: 0,
    });
  });
});
