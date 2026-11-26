// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import App from "./App";
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  Marker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  GeoJSON: () => null,
  Polyline: () => null,
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: () => null,
  Area: () => null,
  AreaChart: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));
const state = {
  aircraft: [
    {
      id: "AC101",
      callsign: "AERO 101",
      latitude: 49.5,
      longitude: 2.1,
      altitude: 35000,
      speed: 462,
      heading: 72,
      status: "Cruising",
    },
  ],
  events: [],
  metrics: { accepted: 0, invalid_authentication: 0, replay: 0 },
  session: "test",
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("dashboard", () => {
  it("sends attack and confidentiality settings to the backend and shows outcome", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async (path: string) => ({
        ok: true,
        json: async () =>
          path.endsWith("/messages")
            ? {
                id: 1,
                outcome: "invalid_authentication",
                explanation: "Changed payload rejected.",
                sequence: 1,
                bytes: 240,
                tag_preview: "aabbccdd",
              }
            : state,
      }));
    vi.stubGlobal("fetch", fetch);
    render(<App />);
    await screen.findByText("Ground station connected");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Confidential mode" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Simulate Tampering" }));
    await screen.findByText("Changed payload rejected.");
    expect(fetch).toHaveBeenCalledWith(
      "/api/messages",
      expect.objectContaining({
        body: JSON.stringify({
          aircraft_id: "AC101",
          action: "tamper",
          confidential: true,
        }),
      }),
    );
  });
  it("shows a retryable connection error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Backend unavailable")),
    );
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Backend unavailable",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Retry connection" }),
    ).toBeTruthy();
  });
});
