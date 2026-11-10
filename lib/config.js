import { createRequire } from 'node:module'

/**
 * The schema library is optional: DSH provides `@deepseek-ai/schemastery`
 * inside its profile, but a plain checkout (CI, tests, direct import) has no
 * node_modules. A missing package must not break the plugin, so it is loaded
 * through a guarded require and `Config` stays undefined when absent.
 */
const requireHere = createRequire(import.meta.url)
const z = (() => {
  try {
    const loaded = requireHere('@deepseek-ai/schemastery')
    return loaded?.default ?? loaded ?? null
  } catch {
    return null
  }
})()

/** @file dsh-better-tooluse configuration: defaults and normalization.
 *
 * The plugin deliberately imports no schema library, so a profile row may set
 * these keys directly. Unknown keys are ignored; invalid values fall back to
 * the default instead of failing activation.
 */

export const CONFIG_DEFAULTS = Object.freeze({
  /** 'hard' denies direct tool calls without describe/act wrapping; 'soft' only warns in diagnostics; 'off' disables the guard. */
  enforceDescribe: 'hard',
  actDescribe: true,
  autoEventize: true,
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
  /** Milliseconds an act-wrapped tool may run before it is auto-detached to a background event (0 disables). */
  autoEventizeMs: 60000,
  /** Interval for background progress broadcasts in ms (0 disables). */
  eventProgressMs: 5000,
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
    enforceDescribe: (typeof input.actDescribe === 'boolean' ? input.actDescribe : input.enforceDescribe !== 'off')
      ? (input.enforceDescribe === 'soft' ? 'soft' : 'hard')
      : 'off',
    actDescribe: typeof input.actDescribe === 'boolean' ? input.actDescribe : input.enforceDescribe !== 'off',
    autoEventize: typeof input.autoEventize === 'boolean' ? input.autoEventize : input.autoEventizeMs !== 0,
    exemptTools: Array.isArray(input.exemptTools)
      ? [...new Set(input.exemptTools.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim()))]
      : [...CONFIG_DEFAULTS.exemptTools],
    protocolTone: TONES.has(input.protocolTone) ? input.protocolTone : CONFIG_DEFAULTS.protocolTone,
    eventEnabled: input.eventEnabled !== false,
    backfillEvents: clampInt(input.backfillEvents, CONFIG_DEFAULTS.backfillEvents, 0, 400),
    autoEventizeMs: (typeof input.autoEventize === 'boolean' ? input.autoEventize : input.autoEventizeMs !== 0)
      ? clampInt(input.autoEventizeMs, CONFIG_DEFAULTS.autoEventizeMs, 0, 600000)
      : 0,
    eventProgressMs: clampInt(input.eventProgressMs, CONFIG_DEFAULTS.eventProgressMs, 0, 60000),
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


/** Loader row schema: the fields the settings page renders. */
export const Config = z === null ? undefined : z.object({
  actDescribe: z.boolean().default(true).description('强制每次普通工具调用由 act 包装并附带 describe；关闭后允许直接调用工具。'),
  autoEventize: z.boolean().default(true).description('act 包的工具运行超过阈值时自动转入后台事件；关闭后同步执行。'),
  autoEventizeMs: z.number().min(0).max(600000).step(1000).default(60000).description('自动转后台的阈值（毫秒，0 表示关闭）。'),
})
