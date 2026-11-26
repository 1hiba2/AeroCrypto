export type Outcome = "accepted" | "invalid_authentication" | "replay";
export interface Aircraft {
  id: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  status: string;
}
export interface SecurityEvent {
  id: number;
  timestamp: string;
  sender: string;
  callsign: string;
  sequence: number;
  outcome: Outcome;
  explanation: string;
  mode: string;
  action: string;
  bytes: number;
  tag_preview: string;
}
export interface Snapshot {
  aircraft: Aircraft[];
  events: SecurityEvent[];
  metrics: Record<Outcome, number>;
  session: string;
}
export const outcomeLabel = (outcome: Outcome) =>
  ({
    accepted: "Accepted",
    invalid_authentication: "Invalid authentication",
    replay: "Replay rejected",
  })[outcome];
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!response.ok)
    throw new Error(
      `Ground station request failed (${response.status}). Check the backend connection.`,
    );
  return response.json();
}
