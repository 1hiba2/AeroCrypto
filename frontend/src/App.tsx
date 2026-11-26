import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import europe from "./data/europe.json";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Check,
  ChevronRight,
  Clock,
  Database,
  Globe,
  Layers,
  LockKeyhole,
  Plane,
  Radio,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  Terminal,
  Wifi,
  Zap,
} from "lucide-react";
import { api, outcomeLabel, type Snapshot, type SecurityEvent } from "./api";

export default function App() {
  const [data, setData] = useState<Snapshot | null>(null),
    [selected, setSelected] = useState("AC101"),
    [confidential, setConfidential] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<SecurityEvent | null>(null),
    [tab, setTab] = useState("all");
  async function refresh() {
    try {
      setData(await api<Snapshot>("/state"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, []);
  async function send(action: string) {
    setBusy(true);
    try {
      setResult(
        await api<SecurityEvent>("/messages", {
          aircraft_id: selected,
          action,
          confidential,
        }),
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    try {
      setData(await api<Snapshot>("/reset", {}));
      setResult(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const aircraft = data?.aircraft.find((a) => a.id === selected),
    metrics = data?.metrics;
  const events =
    data?.events.filter((e) => tab === "all" || e.outcome !== "accepted") ?? [];
  const chart = [...(data?.events ?? [])]
    .reverse()
    .slice(-20)
    .map((e, i) => ({
      name: i + 1,
      verified: e.outcome === "accepted" ? 1 : 0,
      rejected: e.outcome === "accepted" ? 0 : 1,
    }));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">
            <Plane size={24} />
          </span>
          <span>
            AeroCrypto<small>SECURE FLIGHT SYSTEMS</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <a className="nav-item active" href="#overview">
          <Layers size={18} /> Mission control
        </a>
        <a className="nav-item" href="#fleet">
          <Plane size={18} /> Aircraft fleet{" "}
          <span className="nav-count">04</span>
        </a>
        <a className="nav-item" href="#events">
          <Shield size={18} /> Security events
        </a>
        <a className="nav-item" href="#transmitter">
          <Terminal size={18} /> Transmission lab
        </a>
        <div className="sidebar-bottom">
          <div className="sandbox">
            <Shield size={20} />
            <strong>Safe by design</strong>
            <p>
              Synthetic flights. Real cryptography. An isolated learning
              environment.
            </p>
            <span>DEMO SANDBOX</span>
          </div>
          <div className="station">
            <span className="avatar">GS</span>
            <div>
              Ground Station<small>Local environment</small>
            </div>
            <Wifi size={16} />
          </div>
        </div>
      </aside>
      <main id="overview">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={14} /> Mission control
          </div>
          <span className="connection">
            <i className={data ? "dot" : "dot offline"} />
            {data ? "Ground station connected" : "Connecting to ground station"}
          </span>
        </header>
        <div className="page">
          <div className="page-title">
            <div>
              <div className="eyebrow">AVIATION SECURITY OPERATIONS</div>
              <h1>
                Mission control<span className="live-pill">LOCAL DEMO</span>
              </h1>
              <p>Every message authenticated. Every flight in view.</p>
            </div>
            <button className="secondary" disabled={busy} onClick={reset}>
              <RotateCcw size={16} /> Reset demo
            </button>
          </div>
          <div className="notice">
            <Shield size={17} />
            <span>
              <strong>Simulation environment</strong> · All aircraft, positions,
              and telemetry are synthetic. No connection to real aviation
              systems.
            </span>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => void refresh()}>Retry connection</button>
            </div>
          )}
          <section className="metrics" aria-label="Security metrics">
            {[
              {
                label: "Active aircraft",
                value: data?.aircraft.length ?? "—",
                icon: Plane,
                note: "4 synthetic transmitters",
                color: "cyan",
              },
              {
                label: "Verified messages",
                value: metrics?.accepted ?? 0,
                icon: Shield,
                note: "Authenticated & delivered",
                color: "green",
              },
              {
                label: "Rejected messages",
                value: metrics
                  ? metrics.invalid_authentication + metrics.replay
                  : 0,
                icon: ShieldAlert,
                note: "Blocked at the receiver",
                color: "red",
              },
              {
                label: "Replay attempts",
                value: metrics?.replay ?? 0,
                icon: RotateCcw,
                note: "Duplicate sequences detected",
                color: "amber",
              },
            ].map((m) => (
              <div className="metric card" key={m.label}>
                <div>
                  <span>{m.label}</span>
                  <m.icon size={19} className={m.color} />
                </div>
                <strong>{m.value}</strong>
                <small>
                  <span className={m.color}>●</span> {m.note}
                </small>
              </div>
            ))}
          </section>
          <div className="primary-grid">
            <section className="card map-card" id="fleet">
              <div className="section-heading">
                <div>
                  <h2>
                    <Globe size={18} /> Airspace overview
                  </h2>
                  <p>Synthetic European corridor</p>
                </div>
                <span className="chip">
                  <i className="dot" /> 4 AIRCRAFT
                </span>
              </div>
              <div className="map-wrap">
                {data ? (
                  <MapContainer
                    center={[49.7, 4.3]}
                    zoom={5}
                    scrollWheelZoom={false}
                    minZoom={4}
                    maxZoom={8}
                    maxBounds={[
                      [30, -25],
                      [65, 35],
                    ]}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <GeoJSON
                      attribution='Basemap: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain)'
                      data={europe as GeoJsonObject}
                      style={{
                        color: "#2d4b5b",
                        weight: 1,
                        fillColor: "#172c39",
                        fillOpacity: 1,
                      }}
                      onEachFeature={(feature, layer) =>
                        layer.bindTooltip(feature.properties.name, {
                          sticky: true,
                        })
                      }
                    />
                    {[
                      { name: "FRANCE", lat: 46.8, lon: 2.3 },
                      { name: "GERMANY", lat: 51, lon: 10 },
                      { name: "UNITED KINGDOM", lat: 54, lon: -2 },
                      { name: "SPAIN", lat: 40, lon: -3.7 },
                      { name: "ITALY", lat: 43, lon: 12 },
                      { name: "POLAND", lat: 52.5, lon: 19 },
                    ].map((c) => (
                      <Marker
                        key={c.name}
                        position={[c.lat, c.lon]}
                        interactive={false}
                        icon={L.divIcon({
                          className: "country-label",
                          html: c.name,
                          iconSize: [110, 14],
                          iconAnchor: [55, 7],
                        })}
                      />
                    ))}
                    {data.aircraft.map((a) => (
                      <div key={a.id}>
                        <Polyline
                          positions={[
                            [a.latitude - 0.7, a.longitude - 1.5],
                            [a.latitude, a.longitude],
                          ]}
                          pathOptions={{
                            color: a.id === selected ? "#3be1c2" : "#51758b",
                            weight: 2,
                            dashArray: "4 7",
                          }}
                        />
                        <Marker
                          position={[a.latitude, a.longitude]}
                          eventHandlers={{ click: () => setSelected(a.id) }}
                          icon={L.divIcon({
                            className: "aircraft-marker",
                            html: `<div class="plane-marker ${a.id === selected ? "selected" : ""}"><span style="transform:rotate(${a.heading - 90}deg)">✈</span><b>${a.callsign}</b></div>`,
                            iconSize: [110, 45],
                            iconAnchor: [18, 18],
                          })}
                        >
                          <Popup>{a.callsign} · Synthetic flight</Popup>
                        </Marker>
                      </div>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="empty">Awaiting synthetic flight data…</div>
                )}
                <span className="map-caption">
                  SYNTHETIC POSITIONS / NOT FOR NAVIGATION
                </span>
              </div>
              <div className="fleet-tabs">
                {data?.aircraft.map((a) => (
                  <button
                    key={a.id}
                    className={selected === a.id ? "selected" : ""}
                    onClick={() => setSelected(a.id)}
                  >
                    <Plane size={15} />
                    {a.callsign}
                    <span>{a.status}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="card detail">
              <div className="section-heading">
                <h2>Aircraft telemetry</h2>
                <Radio size={18} className="cyan" />
              </div>
              {aircraft ? (
                <>
                  <div className="aircraft-heading">
                    <span className="aircraft-icon">
                      <Plane size={27} />
                    </span>
                    <div>
                      <h3>{aircraft.callsign}</h3>
                      <small>{aircraft.id} · Synthetic aircraft</small>
                    </div>
                    <span className="status">{aircraft.status}</span>
                  </div>
                  <div className="telemetry-grid">
                    {[
                      ["Altitude", aircraft.altitude.toLocaleString(), "ft"],
                      ["Ground speed", aircraft.speed, "kts"],
                      ["Heading", aircraft.heading, "°"],
                      ["Latitude", aircraft.latitude.toFixed(4), "° N"],
                    ].map(([label, value, unit]) => (
                      <div key={label}>
                        <small>{label}</small>
                        <strong>
                          {value}
                          <em>{unit}</em>
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div className="coordinates">
                    <Globe size={14} /> Longitude{" "}
                    {aircraft.longitude.toFixed(4)}° <span>SIMULATED</span>
                  </div>
                  <div className="recent-heading">
                    RECENT TRANSMISSIONS <Clock size={13} />
                  </div>
                  <div className="recent">
                    {data?.events
                      .filter((e) => e.sender === selected)
                      .slice(0, 3)
                      .map((e) => (
                        <div key={e.id}>
                          <span className={`event-dot ${e.outcome}`} />
                          <span>
                            Sequence #{e.sequence}
                            <small>{e.mode.toUpperCase()}</small>
                          </span>
                          <span
                            className={
                              e.outcome === "accepted" ? "green" : "red"
                            }
                          >
                            {e.outcome === "accepted" ? "Verified" : "Rejected"}
                          </span>
                        </div>
                      ))}
                    {!data?.events.some((e) => e.sender === selected) && (
                      <p className="empty-small">
                        No transmissions yet. Send a message below.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty">Loading aircraft…</div>
              )}
            </section>
          </div>
          <div className="secondary-grid">
            <section className="card transmitter" id="transmitter">
              <div className="section-heading">
                <div>
                  <h2>
                    <Terminal size={18} /> Transmission lab
                  </h2>
                  <p>Send a packet. See the security checks in action.</p>
                </div>
                <span className="chip">BACKEND VERIFIED</span>
              </div>
              <div className="lab-options">
                <label>
                  Transmitting aircraft
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {data?.aircraft.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.callsign} · {a.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="encryption">
                  <span>
                    <LockKeyhole size={16} /> Confidential mode
                    <small>AES-256-GCM + HMAC</small>
                  </span>
                  <input
                    aria-label="Confidential mode"
                    type="checkbox"
                    checked={confidential}
                    onChange={(e) => setConfidential(e.target.checked)}
                  />
                </label>
              </div>
              <div className="actions">
                <button
                  className="primary"
                  disabled={busy || !data}
                  onClick={() => send("normal")}
                >
                  <Send size={16} />
                  Send Normal Message
                </button>
                <button
                  className="attack"
                  disabled={busy || !data}
                  onClick={() => send("tamper")}
                >
                  <Zap size={16} />
                  Simulate Tampering
                </button>
                <button
                  className="replay-button"
                  disabled={busy || !data}
                  onClick={() => send("replay")}
                >
                  <RotateCcw size={16} />
                  Simulate Replay
                </button>
              </div>
              <div className={`result ${result?.outcome ?? ""}`} role="status">
                {busy ? (
                  <>
                    <Activity size={18} />
                    <span>Transmitting and verifying packet…</span>
                  </>
                ) : result ? (
                  <>
                    <Shield size={19} />
                    <div>
                      <strong>{outcomeLabel(result.outcome)}</strong>
                      <p>{result.explanation}</p>
                      <code>
                        SEQ {result.sequence} · {result.bytes} BYTES · TAG{" "}
                        {result.tag_preview}…
                      </code>
                    </div>
                  </>
                ) : (
                  <>
                    <LockKeyhole size={19} />
                    <div>
                      <strong>Secure channel ready</strong>
                      <p>
                        Choose a demo action to inspect authentication and
                        replay protection.
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="pipeline">
                <span>
                  <Plane size={14} /> Transmitter
                </span>
                <ChevronRight size={14} />
                <span>
                  <LockKeyhole size={14} />{" "}
                  {confidential ? "Encrypt + sign" : "HMAC-SHA256"}
                </span>
                <ChevronRight size={14} />
                <span>
                  <Shield size={14} /> Receiver
                </span>
              </div>
            </section>
            <section className="card chart-card">
              <div className="section-heading">
                <div>
                  <h2>
                    <Activity size={18} /> Message activity
                  </h2>
                  <p>Last 20 received packets · 1 = outcome occurred</p>
                </div>
              </div>
              <div className="chart">
                {chart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart}>
                      <defs>
                        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                          <stop stopColor="#35d5b5" stopOpacity={0.3} />
                          <stop
                            offset="1"
                            stopColor="#35d5b5"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#223044" vertical={false} />
                      <XAxis dataKey="name" stroke="#7e8da5" tickLine={false} />
                      <YAxis
                        domain={[0, 1]}
                        ticks={[0, 1]}
                        stroke="#7e8da5"
                        width={25}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#111d2e",
                          border: "1px solid #33445b",
                          borderRadius: 8,
                        }}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="verified"
                        stroke="#35d5b5"
                        fill="url(#fill)"
                      />
                      <Area
                        type="stepAfter"
                        dataKey="rejected"
                        stroke="#fa8591"
                        fill="transparent"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty">
                    <Activity size={25} />
                    <p>Your message activity will appear here.</p>
                  </div>
                )}
              </div>
              <div className="chart-legend">
                <span className="green">● Verified</span>
                <span className="red">● Rejected</span>
                <span>Packet sequence</span>
              </div>
            </section>
          </div>
          <section className="card event-card" id="events">
            <div className="section-heading">
              <div>
                <h2>
                  <Shield size={18} /> Security event feed{" "}
                  <span className="count">{data?.events.length ?? 0}</span>
                </h2>
                <p>
                  Receiver decisions, recorded in local SQLite · refreshes every
                  5 seconds
                </p>
              </div>
              <div className="filter" aria-label="Event filter">
                <button
                  className={tab === "all" ? "selected" : ""}
                  onClick={() => setTab("all")}
                >
                  All events
                </button>
                <button
                  className={tab === "threats" ? "selected" : ""}
                  onClick={() => setTab("threats")}
                >
                  Rejected
                </button>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>TIME / LOCAL</th>
                    <th>AIRCRAFT</th>
                    <th>SECURITY OUTCOME</th>
                    <th>DETAILS</th>
                    <th>SEQUENCE</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 12).map((e) => (
                    <tr key={e.id}>
                      <td className="mono">
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <Plane size={14} /> {e.callsign}
                      </td>
                      <td>
                        <span className={`outcome ${e.outcome}`}>
                          {e.outcome === "accepted" ? (
                            <Check size={13} />
                          ) : (
                            <ShieldAlert size={13} />
                          )}{" "}
                          {outcomeLabel(e.outcome)}
                        </span>
                      </td>
                      <td>{e.explanation}</td>
                      <td className="mono">
                        #{String(e.sequence).padStart(4, "0")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length === 0 && (
                <div className="empty">
                  <Database size={24} />
                  <p>
                    {tab === "all"
                      ? "No security events yet. Launch your first transmission."
                      : "No rejected messages in the current history."}
                  </p>
                </div>
              )}
            </div>
          </section>
          <footer>
            <span>
              <Shield size={14} /> AeroCrypto · Built for secure skies
            </span>
            <span>
              Ephemeral backend keys <span className="footer-separator">/</span>{" "}
              Synthetic data only <span className="footer-separator">/</span>{" "}
              v1.0.0
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
