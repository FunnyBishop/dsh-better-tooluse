# Changelog

All notable changes to this project are documented here. The project follows a loose semantic-versioning scheme tied to DSH Harness releases.

## [0.6.1] - 2026-11-11

### Fixed
- The settings `Config` schema no longer breaks plugin loading or tests when `@deepseek-ai/schemastery` is unavailable (CI/clean checkout): it is required optionally and `Config` falls back to `undefined`.

## [0.6.0] - 2026-11-11

### Added
- A **Decision stream** page in the DSH settings navigation (`settings.section` / `settings.section.icon` slots) with the two switches: require act describe, and auto eventize (plus the threshold). Saves go through `configEditor`, so they persist in the profile row and survive restarts; the resident protocol text follows the describe switch.

## [0.5.0] - 2026-11-10

### Added
- The plugin now exports a Loader `Config` schema, so the DSH settings page renders two switches: **act describe** (require the mandatory `act({describe})` wrapper) and **auto eventize** (move long act calls to the background), plus the `autoEventizeMs` threshold. Both apply on the next mount and the protocol text adapts (the mandatory rule is replaced with an optional one when describe is off).

## [0.4.2] - 2026-11-10

### Added
- Collapsible digest sections: act calls, goal, current direction, background events, tool usage and timeline can each be folded/unfolded; the collapsed state is remembered in localStorage.

## [0.4.1] - 2026-11-10

### Fixed
- Digest panel no longer overflows its sidebar border when many act calls or long tool names/arguments are shown: flex children get `min-width: 0`, long text wraps or truncates with an ellipsis, and the panel clips horizontally.

## [0.4.0] - 2026-11-10

### Added
- `autoEventizeMs` (default 60000): an `act`-wrapped tool that runs past the threshold is detached into a background event instead of blocking the turn.
- `eventProgressMs` (default 5000): running background events broadcast progress updates so the panel changes while waiting.
- Background events are expandable in the digest panel (full output), show elapsed time and an `auto` badge.

### Changed
- Completion notices render as a recognizable **⚙ 后台事件** card (status, duration, summary, output block) instead of a plain `System notice` line.
- The protocol asks the model to eventize any parallelizable long operation, not only those over ~60 seconds.

## [0.3.4] - 2026-11-09

### Added
- `act` now repairs malformed argument JSON before failing: raw control characters, trailing commas, truncated strings and unclosed objects/arrays are closed and retried once (`lib/repair.js`). When DSH preserves unparseable tool-call arguments as a raw string, the call can still run instead of being rejected.

## [0.3.3] - 2026-11-09

### Changed
- `act` description and the protocol/skill now tell the model to keep tool arguments small: write long scripts to a file first and run them via `script_path` instead of inlining heredocs, which can truncate the arguments JSON and fail with `Unterminated string in JSON`.

## [0.3.2] - 2026-11-09

### Fixed
- 梳理页主按钮与选中筛选 chip 的前景色改用主题反色 token（`--dsw-alias-bg-base`），修复浅色 `brand-primary` 主题下白字看不清的问题。

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
