/** @file Lenient repair for tool-call argument JSON. */

const ESCAPES = { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f' }

/** Escape raw control characters that appear inside JSON strings. */
function escapeControlCharsInsideStrings(text) {
  let out = ''
  let inString = false
  let escaped = false
  for (const ch of text) {
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue }
      if (ch === '\\') { out += ch; escaped = true; continue }
      if (ch === '"') { out += ch; inString = false; continue }
      const code = ch.codePointAt(0)
      if (code < 0x20) { out += ESCAPES[ch] ?? ('\\u' + code.toString(16).padStart(4, '0')); continue }
      out += ch
      continue
    }
    out += ch
    if (ch === '"') inString = true
  }
  return { text: out, inString, danglingEscape: escaped }
}

/** Append the closers needed to complete a truncated JSON document. */
function closeOpenStructures(text, state) {
  let out = text
  if (state.danglingEscape) out = out.slice(0, -1)
  if (state.inString) out += '"'
  const stack = []
  let inString = false
  let escaped = false
  for (const ch of out) {
    if (inString) {
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') stack.pop()
  }
  while (stack.length > 0) {
    const open = stack.pop()
    out += open === '{' ? '}' : ']'
  }
  return out
}

/**
 * Try to repair one malformed JSON text (raw control chars, trailing commas,
 * truncated strings/structures).
 * @param {unknown} raw
 * @returns {{ value: unknown, repaired: boolean, reason?: string }}
 */
export function repairJsonText(raw) {
  if (typeof raw !== 'string') return { value: undefined, repaired: false, reason: 'not a string' }
  const text = raw.trim()
  if (text.length === 0) return { value: undefined, repaired: false, reason: 'empty' }
  try {
    return { value: JSON.parse(text), repaired: false }
  } catch {
    /* repair below */
  }
  let candidate = text.replace(/,\s*([}\]])/g, '$1')
  const escaped = escapeControlCharsInsideStrings(candidate)
  candidate = closeOpenStructures(escaped.text, escaped)
  candidate = candidate.replace(/,\s*([}\]])/g, '$1')
  try {
    const value = JSON.parse(candidate)
    if (value !== null && typeof value === 'object') return { value, repaired: true }
  } catch {
    /* fall through */
  }
  return { value: undefined, repaired: false, reason: 'unrepairable' }
}

/**
 * Normalize act arguments: plain objects pass through, malformed raw strings
 * get one repair attempt.
 * @param {unknown} raw
 * @returns {{ value: object | null, repaired: boolean, reason?: string }}
 */
export function normalizeActArguments(raw) {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) return { value: raw, repaired: false }
  if (typeof raw === 'string') {
    const result = repairJsonText(raw)
    if (result.value !== null && typeof result.value === 'object' && !Array.isArray(result.value)) {
      return { value: result.value, repaired: true }
    }
    return { value: null, repaired: false, reason: result.reason ?? 'unparseable' }
  }
  return { value: null, repaired: false, reason: 'not an object' }
}
