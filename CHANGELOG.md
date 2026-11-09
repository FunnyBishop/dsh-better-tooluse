# Changelog

All notable changes to this project are documented here. The project follows a loose semantic-versioning scheme tied to DSH Harness releases.

## [0.3.1] - 2026-11-09

### Fixed
- Skill provider entries now carry `rank`, `resourceBase`, and a `fileURLToPath`-resolved Windows path, fixing the DSH `invalid rank` validation error.
- `act` now forwards `exec.toolSet` (step admission) to the nested dispatch, so wrapped calls share the same tool-set gate as direct calls (e.g. an `act`-wrapped `read` that dsh-ops replaced is now rejected).

### Added
- Tool filter chips in the digest panel (combined with the existing status filter).
- `GET /config` for the browser half; `showDockStrip` / `showActCards` / `actCardLimit` client preferences.

## [0.3.0] - 2026-11-09

### Added
- Configurable enforcement (`enforceDescribe: hard | soft | off`), extra `exemptTools`, `protocolTone` (`normal | quiet`), `eventEnabled`, `backfillEvents`, `maxResultChars`.
- Slimmed resident protocol (5 rules) with the detailed rules moved into the packaged `better-tooluse` skill, loaded on demand.
- `node:test` unit suite for describe parsing, guard decisions, config normalization and both protocol tones.
- Digest panel interactions: expandable act cards with full result text, status filter, running-first ordering, quick correction phrases and `auto` / `queue next turn` nudge modes.
- SSE notifications coalesced per microtask; configurable event backfill.

## [0.2.1] - 2026-11-09

### Changed
- Plain-text narration lines (`◎ 目标`, `▸ 决策`, `↳ 发现`, `⟲ 调整`) are mandatory again; UI cards never replace them.

## [0.2.0] - 2026-11-09

### Added
- Mandatory `act({ describe, tool, input })` wrapper and the guard that refuses unwrapped ordinary tool calls.
- `event` tool for long-running background work with automatic follow-up turns and a `list`/`kill` API.

## [0.1.0] - 2026-11-09

### Added
- Initial release: decision-stream protocol, GenUI stage digests, the `梳理` tab for dsh-better-sidebar, the composer dock strip and the per-session SSE stream.
