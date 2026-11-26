# Verification record

Verified locally on Windows, 22 November 2026.

## Passed

- Installed Python dependencies into `backend/.venv` and npm dependencies into `frontend/node_modules`.
- Backend: **13 pytest tests passed** after final backend formatting and simulator changes.
- Frontend: **5 Vitest tests passed** across API client and dashboard components.
- TypeScript and Vite production build passed. Vendor chunks are split for map and chart code; no bundle-size warning remains.
- `npm audit --audit-level=low`: **0 vulnerabilities** reported at verification time.
- `pip check`: no broken requirements.
- Started FastAPI on port 8000 and Vite on port 5173. Confirmed HTTP 200 through the Vite `/api` proxy.
- Exercised normal, tampered and replayed packets in both HMAC and AES-GCM modes through the running API. Outcomes matched expectations; accepted/rejected/replay counters matched recorded history.
- Final live smoke check verified heading-based coordinate movement and climbing altitude changes, then reset the demo to its clean starting data.
- Browser verification: normal accepted, tampering rejected, replay rejected, confidential normal accepted, confidential tampering rejected and confidential replay rejected. Confirmed reset, aircraft selection and rejected-event filtering.
- Checked responsive layouts with observed CSS viewport widths of 390, 1028 and 1440 pixels; document widths stayed within their viewport. Narrow layouts stack cards and allow horizontal scrolling within the event table.
- Replaced credential-dependent map tiles found during browser QA with bundled Natural Earth geometry. The final app makes no runtime map-provider requests.
- Captured actual application screenshots: `docs/screenshots/dashboard.jpg` and `docs/screenshots/replay.jpg`. These are viewport captures, not full-page composites. Screenshots precede the final heading-based simulator refinement; security outcomes and UI are unchanged.

## Limits

- Docker is not installed in this environment; Dockerfiles, Nginx routing and Compose are provided but were not built or run.
- GitHub Actions configuration was added; hosted CI has not been triggered. No GitHub repository was created or pushed.
- Verification ran on Windows. macOS/Linux instructions and container behavior have not been exercised here.
- Frontend component tests mock Leaflet and Recharts; actual map and chart rendering were inspected in the browser. This project does not include an unattended browser E2E runner.
- Starlette emits one test-client deprecation warning about its future transition from `httpx` to `httpx2`; all tests pass with the pinned dependencies.
- The source archive excludes installed dependencies, build outputs, local SQLite files and caches. Preview servers were stopped after verification; use the README commands to start them again.

Security limitations, ephemeral state and single-worker requirements are documented in README.md.
