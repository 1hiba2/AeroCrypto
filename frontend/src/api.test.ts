import { describe, it, expect, vi, afterEach } from "vitest";
import { api, outcomeLabel } from "./api";
describe("API client", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses backend POST with typed demo options", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ outcome: "replay" }),
      });
    vi.stubGlobal("fetch", fetch);
    expect(await api("/messages", { action: "replay" })).toEqual({
      outcome: "replay",
    });
    expect(fetch).toHaveBeenCalledWith("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"action":"replay"}',
    });
  });
  it("surfaces receiver connection errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    await expect(api("/state")).rejects.toThrow("503");
  });
  it("labels security decisions clearly", () => {
    expect(outcomeLabel("accepted")).toBe("Accepted");
    expect(outcomeLabel("invalid_authentication")).toBe(
      "Invalid authentication",
    );
    expect(outcomeLabel("replay")).toBe("Replay rejected");
  });
});
