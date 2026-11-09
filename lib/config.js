/** @file dsh-better-tooluse configuration: defaults and normalization.
 *
 * The plugin deliberately imports no schema library, so a profile row may set
 * these keys directly. Unknown keys are ignored; invalid values fall back to
 * the default instead of failing activation.
 */

export const CONFIG_DEFAULTS = Object.freeze({
  /** 'hard' denies direct tool calls without describe/act wrapping; 'soft' only warns in diagnostics; 'off' disables the guard. */
  enforceDescribe: 'hard',
  /** Extra tool names that may be called directly (added to the built-in list). */
  exemptTools: [],
  /** 'normal' keeps the compact protocol; 'quiet' drops the phase-card guidance. */
  protocolTone: 'normal',
  /** Register the background `event` tool and the eventization guidance. */
  eventEnabled: true,
  /** How many recent session events to backfill when a panel opens. */
  backfillEvents: 120,
  /** Upper bound for the result text kept for an act call (panel expansion). */
  maxResultChars: 2000,
  /** Client-side panel preferences (served by GET /config). */
  showDockStrip: true,
  showActCards: true,
  actCardLimit: 10,
})

const ENFORCE_MODES = new Set(['hard', 'soft', 'off'])
const TONES = new Set(['normal', 'quiet'])

const clampInt = (value, fallback, min, max) => {
  const number = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

/**
 * Merge a raw plugin row config over the defaults.
 * @param {unknown} raw
 * @returns {typeof CONFIG_DEFAULTS}
 */
export function normalizeConfig(raw) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    enforceDescribe: ENFORCE_MODES.has(input.enforceDescribe) ? input.enforceDescribe : CONFIG_DEFAULTS.enforceDescribe,
    exemptTools: Array.isArray(input.exemptTools)
      ? [...new Set(input.exemptTools.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim()))]
      : [...CONFIG_DEFAULTS.exemptTools],
    protocolTone: TONES.has(input.protocolTone) ? input.protocolTone : CONFIG_DEFAULTS.protocolTone,
    eventEnabled: input.eventEnabled !== false,
    backfillEvents: clampInt(input.backfillEvents, CONFIG_DEFAULTS.backfillEvents, 0, 400),
    maxResultChars: clampInt(input.maxResultChars, CONFIG_DEFAULTS.maxResultChars, 200, 8000),
    showDockStrip: input.showDockStrip !== false,
    showActCards: input.showActCards !== false,
    actCardLimit: clampInt(input.actCardLimit, CONFIG_DEFAULTS.actCardLimit, 1, 30),
  }
}

/** The subset of config the browser half may read. */
export function clientConfigOf(config) {
  return {
    showDockStrip: config.showDockStrip,
    showActCards: config.showActCards,
    actCardLimit: config.actCardLimit,
  }
}
