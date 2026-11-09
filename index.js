/**
 * dsh-better-tooluse — Host half.
 *
 * Two jobs:
 *
 * 1. Prompt protocol. One static behavioural section makes the agent narrate
 *    its judgements in the visible reply while it works, and render a compact
 *    GenUI "阶段梳理卡" at milestones:
 *      ◎ 目标：…      once, when a complex task starts
 *      ▸ 决策：… → …  before each tool batch
 *      ↳ 发现：… → …  after a batch of tool results
 *      ⟲ 调整：… → …  when the user steers mid-run
 *    The section is static text (no timestamps, no per-session facts), so it
 *    does not break provider prompt caching.
 *
 * 2. Live stream. Observing the durable session log, this half derives compact
 *    decision events (protocol lines + tool call/result lifecycle + user
 *    messages + run status) and serves them to the browser half as Server-Sent
 *    Events. It also accepts one-line "纠偏" nudges and routes them into the
 *    live agent's inbox (steer while running, followup while idle), which also
 *    powers the sidebar's "生成梳理卡" button.
 *
 * Transport is the host webserver service (a package-owned prefix route), the
 * same mechanism @changfenhuang/dsh-genui uses for its lazy assets, so no
 * generated typert artifacts and no bare @deepseek-ai imports are needed.
 *
 * @module dsh-better-tooluse
 */

import { randomUUID } from 'node:crypto'
import { appendFileSync, readFileSync, statSync, truncateSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProtocolText } from './lib/protocol.js'
import { normalizeConfig, clientConfigOf } from './lib/config.js'
import { describeGuardDecision, DEFAULT_EXEMPT } from './lib/guard.js'

/* ------------------------------------------------------------------ prompt -- */

/** Sections are concatenated in ascending order; 700 sits after team policy
 * (600) and before the PTC/file-reference guidance (800/900), which keeps the
 * working protocol near the top of the behavioural guidance without shadowing
 * any centrally allocated name. */
const SECTION_ORDER = 700

const SECTION_NAME = 'better-tooluse:protocol'

/* ----------------------------------------------------------------- routing -- */

/** Package-owned prefix under /plugins; longer than the generic bundle prefix. */
const ROUTE = '/plugins/dsh-better-tooluse'

const MAX_EVENTS_PER_SESSION = 300
const MAX_SESSIONS = 40
const MAX_BODY_BYTES = 64 * 1024
const MAX_NUDGE_CHARS = 2000
const MAX_EVENT_OUTPUT_CHARS = 3000
const REPORT_PATH = join(tmpdir(), 'dsh-better-tooluse-report.jsonl')
const REPORT_MAX_BYTES = 512 * 1024

/** @param {unknown} value @returns {unknown} deep-frozen clone-free freeze */
function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

/** @param {string} text @param {number} max */
function truncate(text, max) {
  const flat = text.replace(/\s+/gu, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`
}

/* ------------------------------------------------------------ event derive -- */

const MARKER_KIND = {
  '◎': 'goal',
  '▸': 'decision',
  '↳': 'finding',
  '⟲': 'adjust',
}

const MARKER_LINE_RE = /^\s*(?:[-*+]\s+)?(?:>\s*)?(?:\*\*|\*|__)?\s*([◎▸↳⟲])\s*(目标|决策|发现|调整)\s*[：:]\s*(?:\*\*|\*|__)?\s*(.+?)\s*$/u

/** Split one decision line into the structured `describe` field.
 *  Convention: "<思考结果> → <本步工具作用>"; the arrow is the field separator,
 *  so a line without one keeps the whole text as the thinking result. */
function splitDescribe(text) {
  const arrow = text.lastIndexOf('→') >= 0 ? '→' : text.lastIndexOf('->') >= 0 ? '->' : null
  if (arrow === null) return { thinking: truncate(text, 220), purpose: '' }
  const index = text.lastIndexOf(arrow)
  const thinking = text.slice(0, index).replace(/[\s:：,，-]+$/u, '').trim()
  const purpose = text.slice(index + arrow.length).trim()
  return { thinking: truncate(thinking, 220), purpose: truncate(purpose, 160) }
}

/** Pull protocol lines out of one assistant message's visible text blocks. */
function protocolLines(content) {
  const out = []
  for (const block of Array.isArray(content) ? content : []) {
    if (block?.type !== 'text' || typeof block.text !== 'string') continue
    for (const line of block.text.split(/\r?\n/u)) {
      const match = MARKER_LINE_RE.exec(line)
      if (match === null) continue
      const text = match[3].replace(/(?:\*\*|\*|__)\s*$/u, '').trim()
      if (text.length === 0) continue
      const kind = MARKER_KIND[match[1]] ?? 'decision'
      if (kind === 'decision') {
        const describe = splitDescribe(text)
        out.push({ kind, label: match[2], text: truncate(text, 240), thinking: describe.thinking, purpose: describe.purpose })
      } else {
        out.push({ kind, label: match[2], text: truncate(text, 240) })
      }
    }
  }
  return out
}

/** Fallback digest when the model did not narrate: last meaningful reasoning line. */
function reasoningDigest(content) {
  const parts = []
  for (const block of Array.isArray(content) ? content : []) {
    if (block?.type === 'reasoning' && typeof block.text === 'string') parts.push(block.text)
  }
  if (parts.length === 0) return null
  const lines = parts.join('\n').split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].replace(/^[#>*\-+\s]+/u, '').replace(/[`*_]/gu, '').trim()
    if (line.length < 24) continue
    return truncate(line, 160)
  }
  return null
}

/** Compact one-line summary of JSON tool arguments, tool-agnostic. */
function summarizeArgs(raw) {
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    return truncate(String(raw ?? ''), 100)
  }
  if (value === null || typeof value !== 'object') return truncate(String(value), 100)
  const preferred = ['command', 'cmd', 'path', 'file_path', 'filePath', 'query', 'pattern', 'url', 'prompt', 'description', 'action', 'name', 'title']
  const keys = Object.keys(value)
  const ordered = [...preferred.filter(key => key in value), ...keys.filter(key => !preferred.includes(key))]
  const parts = []
  for (const key of ordered.slice(0, 3)) {
    const item = value[key]
    const rendered = typeof item === 'string' ? item : JSON.stringify(item)
    if (rendered === undefined) continue
    const short = truncate(rendered, 70)
    if (short.length === 0) continue
    parts.push(keys.length > 3 && key !== 'command' && key !== 'path' ? `${key}=${short}` : short)
  }
  return truncate(parts.join(' · '), 140)
}

/** First meaningful line of a tool result message. */
function summarizeResult(message) {
  const blocks = Array.isArray(message?.content) ? message.content : []
  for (const block of blocks) {
    if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim().length > 0) {
      return truncate(block.text, 180)
    }
  }
  return ''
}

/** Compact machine-readable outcome carried by tool presentation metadata. */
function outcomeOf(meta) {
  if (meta === null || typeof meta !== 'object') return undefined
  const shell = meta.opsShell
  if (shell !== null && typeof shell === 'object') {
    if (typeof shell.exitCode === 'number') return `exit ${shell.exitCode}`
    if (typeof shell.signal === 'string') return `signal ${shell.signal}`
  }
  const ops = meta.opsOutcome
  if (ops !== null && typeof ops === 'object') {
    const bits = []
    if (typeof ops.status === 'string') bits.push(ops.status)
    if (typeof ops.done === 'number' && typeof ops.total === 'number') bits.push(`${ops.done}/${ops.total}`)
    else if (typeof ops.total === 'number') bits.push(`${ops.total} items`)
    if (typeof ops.failed === 'number' && ops.failed > 0) bits.push(`${ops.failed} failed`)
    if (ops.error !== null && typeof ops.error === 'object' && typeof ops.error.code === 'string') bits.push(ops.error.code)
    if (bits.length > 0) return truncate(bits.join(' · '), 80)
  }
  return undefined
}

/** Text of a user message. */
function userText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : []
  const text = blocks
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join(' ')
    .trim()
  if (text.length > 0) return truncate(text, 220)
  const kinds = blocks.map(block => block?.type).filter(Boolean)
  return kinds.length > 0 ? `[${kinds.join(', ')}]` : ''
}

/* ------------------------------------------------------------------ service -- */

/**
 * @param {object} ctx Cordis context.
 */
export function apply(ctx, rawConfig = {}) {
  const config = normalizeConfig(rawConfig)
  /** Install the model-facing protocol first; it needs no other service. */
  const sectionText = (context) => {
    const scope = context?.scope
    const id = scope !== null && typeof scope === 'object' ? scope.id : undefined
    if (id !== undefined) {
      const sessions = ctx.get('sessions')
      if (sessions !== undefined && typeof sessions.get === 'function') {
        try {
          if (sessions.get(id)?.header?.origin === 'subagent') return ''
        } catch {
          /* fall through to the protocol */
        }
      }
    }
    return buildProtocolText({ tone: config.protocolTone, eventEnabled: config.eventEnabled })
  }

  ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: SECTION_ORDER,
    interpolate: false,
    text: sectionText,
  })

  /** sessionId -> { seq, events, status, subscribers, lastStreamAt } */
  const sessions = new Map()
  let lastStreamAt = 0
  let streamCount = 0

  const ensure = (sessionId) => {
    let state = sessions.get(sessionId)
    if (state === undefined) {
      state = { events: [], status: 'idle', subscribers: new Set(), seq: 0, pendingDescribe: null }
      sessions.set(sessionId, state)
      while (sessions.size > MAX_SESSIONS) {
        const oldest = sessions.keys().next().value
        if (oldest === undefined || oldest === sessionId) break
        const dropped = sessions.get(oldest)
        sessions.delete(oldest)
        if (dropped !== undefined) {
          for (const res of dropped.subscribers) res.end()
        }
      }
    }
    return state
  }

  const writeFrame = (res, frame) => {
    try {
      res.write(`data: ${JSON.stringify(frame)}\n\n`)
    } catch {
      /* subscriber closed between checks */
    }
  }

  const broadcast = (sessionId, state, frame) => {
    for (const res of state.subscribers) writeFrame(res, frame)
    void sessionId
  }

  const pushEvent = (sessionId, state, event) => {
    state.events.push(event)
    if (state.events.length > MAX_EVENTS_PER_SESSION) state.events.splice(0, state.events.length - MAX_EVENTS_PER_SESSION)
    broadcast(sessionId, state, { type: 'event', event })
  }

  const setStatus = (sessionId, state, status) => {
    if (state.status === status) return
    state.status = status
    broadcast(sessionId, state, { type: 'status', status })
  }

  /* -------------------------------------------------- background events -- */

  /** eventId -> one background event record (in-memory; the completion notice is durable). */
  const backgroundEvents = new Map()
  const backgroundPrefix = randomUUID().slice(0, 8)
  let backgroundSeq = 0

  const eventPublic = (record) => ({
    eventId: record.eventId,
    tool: record.tool,
    label: record.label,
    status: record.status,
    startedAt: record.startedAt,
    ...(record.finishedAt === undefined ? {} : { finishedAt: record.finishedAt }),
    ...(record.summary === undefined ? {} : { summary: record.summary }),
    ...(record.error === undefined ? {} : { error: record.error }),
  })

  const backgroundView = (record) => ({
    kind: 'background',
    id: `bg:${record.eventId}`,
    eventId: record.eventId,
    tool: record.tool,
    label: record.label,
    args: record.argsSummary,
    status: record.status,
    time: record.startedAt,
    ...(record.finishedAt === undefined ? {} : { endedAt: record.finishedAt }),
    ...(record.summary === undefined ? {} : { summary: record.summary }),
    ...(record.error === undefined ? {} : { error: record.error }),
  })

  const broadcastBackground = (record) => {
    const state = sessions.get(record.sessionId)
    if (state === undefined) return
    const view = backgroundView(record)
    const existing = state.events.find(item => item.kind === 'background' && item.eventId === record.eventId)
    if (existing !== undefined) {
      Object.assign(existing, view)
      broadcast(record.sessionId, state, { type: 'update', event: existing })
      return
    }
    state.events.push(view)
    if (state.events.length > MAX_EVENTS_PER_SESSION) state.events.splice(0, state.events.length - MAX_EVENTS_PER_SESSION)
    broadcast(record.sessionId, state, { type: 'event', event: view })
  }

  /** Join the text blocks of a tool result, bounded. */
  const textContentOf = (content) => {
    const parts = []
    for (const block of Array.isArray(content) ? content : []) {
      if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim().length > 0) parts.push(block.text)
    }
    return parts.join('\n')
  }

  /** Deliver a settled background event as a user-role notice and wake the agent (next turn). */
  const deliverBackgroundNotice = async (record) => {
    try {
      const agents = ctx.get('agents')
      const agent = agents !== undefined && typeof agents.get === 'function' ? agents.get(record.sessionId) : undefined
      if (agent === undefined || agent === null) return
      const seconds = Math.max(0, Math.round(((record.finishedAt ?? Date.now()) - record.startedAt) / 1000))
      const subject = `Background event ${record.eventId} (${record.tool}${record.label !== record.tool ? ` · ${record.label}` : ''})`
      const outcome = record.status === 'completed' ? `finished after ${seconds}s.` : record.status === 'killed' ? `was stopped after ${seconds}s.` : `failed after ${seconds}s.`
      const lines = [`System notice: ${subject} ${outcome}`]
      if (record.error !== undefined) lines.push(`Error: ${record.error}`)
      if (typeof record.output === 'string' && record.output.length > 0) lines.push('Output (may be truncated):', record.output)
      lines.push('Continue the task in the user\'s language. Open your report with a "↳ 发现" line; do not re-run the event unless its result is unusable.')
      const message = deepFreeze({
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: lines.join('\n') }],
        source: { kind: 'user' },
      })
      agent.followup(message)
    } catch {
      /* an event with no live agent stays visible in the panel only */
    }
  }

  const settleBackground = (record, status, extra) => {
    record.status = status
    record.finishedAt = Date.now()
    if (extra?.summary !== undefined) record.summary = extra.summary
    if (extra?.error !== undefined) record.error = extra.error
    if (extra?.output !== undefined) record.output = extra.output
    broadcastBackground(record)
    void deliverBackgroundNotice(record)
  }

  /** Derive zero or more panel events from one durable session event. */
  const ingest = (sessionId, event) => {
    if (event === null || typeof event !== 'object') return
    const state = ensure(sessionId)
    if (typeof event.seq === 'number') state.seq = Math.max(state.seq, event.seq)
    const time = typeof event.time === 'number' ? event.time : Date.now()

    switch (event.type) {
      case 'turn/start': {
        state.pendingDescribe = null
        setStatus(sessionId, state, 'running')
        pushEvent(sessionId, state, { kind: 'turn', id: `turn:${event.seq}`, seq: event.seq, time, turn: event.data?.turn ?? 0 })
        return
      }
      case 'turn/end': {
        setStatus(sessionId, state, 'idle')
        return
      }
      case 'assistant/message': {
        const content = event.data?.message?.content
        const lines = protocolLines(content)
        let describeLine = null
        for (const line of lines) {
          if (line.kind === 'decision' && describeLine === null) describeLine = line
          pushEvent(sessionId, state, {
            kind: line.kind,
            label: line.label,
            text: line.text,
            ...(line.thinking === undefined ? {} : { thinking: line.thinking }),
            ...(line.purpose === undefined ? {} : { purpose: line.purpose }),
            id: `line:${event.seq}:${state.events.length}`,
            seq: event.seq,
            time,
            turn: event.data?.turn ?? 0,
            step: event.data?.step ?? 0,
            source: 'text',
          })
        }
        if (describeLine !== null) {
          state.pendingDescribe = {
            thinking: describeLine.thinking,
            purpose: describeLine.purpose,
            turn: event.data?.turn ?? 0,
            step: event.data?.step ?? 0,
            source: 'text',
          }
        } else if (lines.length === 0) {
          const digest = reasoningDigest(content)
          if (digest !== null) {
            state.pendingDescribe = {
              thinking: digest,
              purpose: '',
              turn: event.data?.turn ?? 0,
              step: event.data?.step ?? 0,
              source: 'reasoning',
            }
            pushEvent(sessionId, state, {
              kind: 'think',
              label: '思考',
              text: digest,
              id: `think:${event.seq}`,
              seq: event.seq,
              time,
              turn: event.data?.turn ?? 0,
              step: event.data?.step ?? 0,
              source: 'reasoning',
            })
          }
        }
        return
      }
      case 'tool/call': {
        const callId = String(event.data?.callId ?? `call:${event.seq}`)
        let tool = String(event.data?.name ?? 'tool')
        let rawArguments = event.data?.arguments
        let explicitDescribe = null
        let via = 'direct'
        if (tool === 'act') {
          via = 'act'
          try {
            const parsed = JSON.parse(String(rawArguments ?? '{}'))
            if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
              if (typeof parsed.tool === 'string' && parsed.tool.length > 0) tool = parsed.tool
              rawArguments = JSON.stringify(parsed.input ?? {})
              if (typeof parsed.describe === 'string' && parsed.describe.trim().length > 0) explicitDescribe = splitDescribe(parsed.describe)
            }
          } catch {
            /* keep the raw act arguments */
          }
        }
        const args = summarizeArgs(typeof rawArguments === 'string' ? rawArguments : JSON.stringify(rawArguments ?? {}))
        const describe = explicitDescribe !== null
          ? explicitDescribe
          : state.pendingDescribe === null ? null : { ...state.pendingDescribe }
        pushEvent(sessionId, state, {
          kind: 'tool',
          id: `tool:${callId}`,
          callId,
          tool,
          args,
          ...(describe === null ? {} : { describe }),
          ...(via === 'act' ? { via } : {}),
          status: 'running',
          seq: event.seq,
          time,
          turn: event.data?.turn ?? 0,
          step: event.data?.step ?? 0,
        })
        return
      }
      case 'tool/result': {
        const message = event.data?.message
        const callId = String(message?.toolCallId ?? '')
        const failed = Boolean(event.data?.error) || message?.isError === true
        const summary = summarizeResult(message)
        const resultText = textContentOf(message?.content).slice(0, config.maxResultChars)
        const outcome = outcomeOf(event.data?.meta)
        const failure = event.data?.error
        const fallback = failed && summary.length === 0 && failure !== undefined
          ? truncate([failure.name, failure.code].filter(Boolean).join(' · '), 120)
          : ''
        const existing = state.events.find(item => item.kind === 'tool' && item.callId === callId)
        if (existing !== undefined) {
          existing.status = failed ? 'failed' : 'done'
          existing.endedAt = time
          if (summary.length > 0) existing.summary = summary
          if (resultText.length > 0) existing.resultText = resultText
          else if (fallback.length > 0) existing.summary = fallback
          if (outcome !== undefined) existing.outcome = outcome
          broadcast(sessionId, state, { type: 'update', event: existing })
        } else {
          pushEvent(sessionId, state, {
            kind: 'tool',
            id: `tool:${callId}:${event.seq}`,
            callId,
            tool: 'tool',
            args: '',
            status: failed ? 'failed' : 'done',
            summary: summary.length > 0 ? summary : fallback,
            ...(resultText.length > 0 ? { resultText } : {}),
            outcome,
            seq: event.seq,
            time,
            endedAt: time,
            turn: event.data?.turn ?? 0,
            step: event.data?.step ?? 0,
          })
        }
        return
      }
      case 'user/message': {
        const text = userText(event.data)
        if (text.length === 0) return
        pushEvent(sessionId, state, {
          kind: 'user',
          id: `user:${event.seq}`,
          text,
          seq: event.seq,
          time,
        })
        return
      }
      case 'step/start': {
        setStatus(sessionId, state, 'running')
        return
      }
      default:
        return
    }
  }

  /** Re-derive recent history when a panel opens for a session we have not seen. */
  const backfill = (sessionId, state) => {
    const store = ctx.get('sessions')
    if (store === undefined || typeof store.get !== 'function') return
    let session
    try {
      session = store.get(sessionId)
    } catch {
      return
    }
    if (session === undefined || session === null) return
    try {
      if (config.backfillEvents <= 0) return
      const from = Math.max(0, Number(session.seq ?? 0) - config.backfillEvents)
      const events = session.snapshotEvents(from)
      for (const event of events) ingest(sessionId, event)
    } catch {
      /* history is optional */
    }
  }

  /** Observe every committed session event; scoped dispatch still reaches root listeners. */
  ctx.on('session/event', (session, event) => {
    if (session === undefined || session === null) return
    ingest(String(session.id), event)
  })

  /** Live run status for the panel indicator. */
  ctx.on('agent/status', (payload) => {
    const id = payload?.agent?.id
    if (id === undefined) return
    setStatus(String(id), ensure(String(id)), payload.status === 'running' ? 'running' : 'idle')
  })

  /** Drop state when a session leaves the process. */
  ctx.on('session/disposed', (session) => {
    const id = String(session?.id ?? '')
    for (const record of backgroundEvents.values()) {
      if (record.sessionId !== id || record.status !== 'running') continue
      record.status = 'killed'
      record.finishedAt = Date.now()
      try {
        record.controller.abort()
      } catch {
        /* already aborted */
      }
    }
    const state = sessions.get(id)
    if (state === undefined) return
    for (const res of state.subscribers) res.end()
    sessions.delete(id)
  })

  /* ------------------------------------------------------------ act tool -- */

  const ACT_TOOL_NAME = 'act'

  const actToolDefinition = {
    name: ACT_TOOL_NAME,
    description: 'Mandatory wrapper for ordinary tool calls so every call carries a describe field. Call act({describe, tool, input}) instead of the tool directly. describe is required: first the thinking result that led here, then "→" and the purpose of this tool call in this step. Interactive/control tools (ask_user_question, present, render_ui, event, team/subagent, goal, schedule, job, terminal, skill, todo, workflow, plugin_manager, cordis_*) may be called directly; if a direct call is refused, wrap it with act.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        describe: { type: 'string', description: 'Required. "<thinking result> → <purpose of this tool call>". The frontend renders both halves.' },
        tool: { type: 'string', description: 'Exact name of the tool to execute (must be callable by this session).' },
        input: { type: 'object', additionalProperties: true, description: 'The argument object for that tool, exactly as a direct call would pass it.' },
      },
      required: ['describe', 'tool'],
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => {
        const content = value !== null && typeof value === 'object' && Array.isArray(value.content) ? value.content : []
        const prefix = value !== null && typeof value === 'object' && value.isError === true
          ? [{ type: 'text', text: 'Error: the wrapped tool returned an error.' }]
          : []
        return [...prefix, ...content]
      },
      presentationMeta: (args, value) => ({
        describe: typeof args?.describe === 'string' ? args.describe : '',
        tool: typeof args?.tool === 'string' ? args.tool : '',
        ok: !(value !== null && typeof value === 'object' && value.isError === true),
      }),
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('act requires an agent session')
      const describe = typeof args.describe === 'string' ? args.describe.trim() : ''
      if (describe.length === 0) throw new Error('describe is required: act({describe:"<thinking result> → <purpose>", tool:"<tool name>", input:{...}})')
      const tool = typeof args.tool === 'string' ? args.tool.trim() : ''
      if (tool.length === 0) throw new Error('act requires the tool name')
      if (tool === ACT_TOOL_NAME) throw new Error('act cannot wrap itself')
      if (tool === EVENT_TOOL_NAME) throw new Error('call event directly to eventize a long operation')
      const toolsService = ctx.get('tools')
      if (toolsService === undefined) throw new Error('the tools service is not available')
      const definition = toolsService.executable(tool, agent, exec.toolSet)
      if (definition === undefined) throw new Error('tool "' + tool + '" is not callable by this session right now')
      const input = args.input !== null && typeof args.input === 'object' && !Array.isArray(args.input) ? args.input : {}
      const batch = await toolsService.execute({
        calls: [{ type: 'tool-call', id: 'act-inner-' + randomUUID(), name: tool, arguments: JSON.stringify(input) }],
        signal: exec.signal,
        agent,
        ...(exec.toolSet === undefined ? {} : { toolSet: exec.toolSet }),
        maxParallelToolCalls: 1,
      })
      for (const context of Array.isArray(batch.additionalContexts) ? batch.additionalContexts : []) {
        try {
          exec.deferContext(context)
        } catch {
          /* forwarding is best-effort */
        }
      }
      if (batch.concluded === true) {
        try {
          exec.concludeTurn()
        } catch {
          /* forwarding is best-effort */
        }
      }
      const first = Array.isArray(batch.results) && batch.results.length > 0 ? batch.results[0].result : undefined
      if (first === undefined) throw new Error('the wrapped tool produced no result')
      return {
        describe,
        tool,
        isError: first.isError === true,
        content: Array.isArray(first.content) ? first.content : [],
        ...(first.meta === undefined ? {} : { meta: first.meta }),
      }
    },
  }

  ctx.inject(['tools'], (toolsCtx) => {
    toolsCtx.effect(function* () {
      yield toolsCtx.tools.register(actToolDefinition)
    }, 'dsh-better-tooluse: act tool')

    /** Make describe mandatory: ordinary direct tool calls are refused and redirected to act. */
    toolsCtx.effect(() => toolsCtx.tools.guard((exec) => {
      const toolName = String(exec?.name ?? '')
      if (toolName.length === 0) return undefined
      const agent = exec?.agent
      let subagent = false
      if (agent !== undefined && agent !== null) {
        const sessionStore = ctx.get('sessions')
        if (sessionStore !== undefined && typeof sessionStore.get === 'function') {
          try {
            subagent = sessionStore.get(String(agent.id))?.header?.origin === 'subagent'
          } catch {
            subagent = false
          }
        }
      }
      const exempt = new Set([...DEFAULT_EXEMPT, ...config.exemptTools])
      return describeGuardDecision({
        toolName,
        callId: String(exec?.callId ?? ''),
        rootCallId: String(exec?.rootCallId ?? ''),
        exempt,
        subagent,
        mode: config.enforceDescribe,
      })
    }), 'dsh-better-tooluse: describe guard')
  })

  /* ---------------------------------------------------------- event tool -- */

  const EVENT_TOOL_NAME = 'event'

  const eventToolDefinition = {
    name: EVENT_TOOL_NAME,
    description: 'Turn a long-running tool call into a background event. It returns immediately: the user can keep chatting with you while it runs, and when it finishes its result is added to the conversation and starts a new round automatically. Use it for work you expect to take more than roughly a minute (builds, test suites, package installs, large scans, long remote or terminal commands, big downloads). Do not eventize quick reads, edits, or searches. Actions: run starts an event for another currently callable tool; list shows your background events; kill cancels a running one.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: { type: 'string', enum: ['run', 'list', 'kill'], description: 'run: start a background event; list: show your events; kill: cancel a running event.' },
        tool: { type: 'string', description: 'run only: exact name of a tool you can call right now (for example a shell or file-operation tool).' },
        input: { type: 'object', additionalProperties: true, description: 'run only: the argument object for that tool, exactly as you would pass it in a normal call.' },
        label: { type: 'string', description: 'run only: short human label such as "run test suite".' },
        eventId: { type: 'string', description: 'kill only: the event id returned by run or list.' },
      },
      required: ['action'],
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => {
        if (value !== null && typeof value === 'object' && Array.isArray(value.events)) {
          if (value.events.length === 0) return [{ type: 'text', text: 'No background events for this session.' }]
          return [{ type: 'text', text: value.events.map(item => item.eventId + ' · ' + item.tool + ' · ' + item.status + ' · ' + item.label).join('\n') }]
        }
        if (value !== null && typeof value === 'object' && value.event !== undefined) {
          const item = value.event
          return [{ type: 'text', text: item.eventId + ' · ' + item.tool + ' · ' + item.status + (item.label !== undefined ? ' · ' + item.label : '') }]
        }
        return [{ type: 'text', text: 'Background event updated.' }]
      },
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('event requires an agent session')
      const sessionId = String(agent.id)
      ensure(sessionId)
      const action = typeof args.action === 'string' ? args.action : ''
      const toolsService = ctx.get('tools')
      if (action === 'list') {
        const mine = [...backgroundEvents.values()]
          .filter(record => record.sessionId === sessionId)
          .sort((a, b) => b.startedAt - a.startedAt)
          .slice(0, 20)
        return { action: 'list', events: mine.map(eventPublic) }
      }
      if (action === 'kill') {
        const record = backgroundEvents.get(String(args.eventId ?? ''))
        if (record === undefined || record.sessionId !== sessionId) throw new Error('unknown background event "' + String(args.eventId ?? '') + '"')
        if (record.status !== 'running') return { action: 'kill', event: eventPublic(record) }
        record.status = 'killed'
        record.finishedAt = Date.now()
        broadcastBackground(record)
        try {
          record.controller.abort()
        } catch {
          /* already aborted */
        }
        return { action: 'kill', event: eventPublic(record) }
      }
      if (action !== 'run') throw new Error('event requires action "run", "list", or "kill"')
      if (toolsService === undefined) throw new Error('the tools service is not available')
      const tool = typeof args.tool === 'string' ? args.tool.trim() : ''
      if (tool.length === 0) throw new Error('event run requires "tool"')
      if (tool === EVENT_TOOL_NAME) throw new Error('event cannot run itself in the background')
      const definition = toolsService.executable(tool, agent)
      if (definition === undefined) throw new Error('tool "' + tool + '" is not callable by this session right now')
      const input = args.input !== null && typeof args.input === 'object' && !Array.isArray(args.input) ? args.input : {}
      const label = typeof args.label === 'string' && args.label.trim().length > 0 ? truncate(args.label.trim(), 80) : tool
      backgroundSeq += 1
      const eventId = 'evt-' + backgroundPrefix + '-' + backgroundSeq
      const controller = new AbortController()
      const record = {
        eventId,
        sessionId,
        tool,
        label,
        argsSummary: summarizeArgs(JSON.stringify(input)),
        status: 'running',
        startedAt: Date.now(),
        controller,
      }
      backgroundEvents.set(eventId, record)
      broadcastBackground(record)
      if (backgroundEvents.size > 100) {
        const oldestSettled = [...backgroundEvents.values()].find(item => item.status !== 'running')
        if (oldestSettled !== undefined) backgroundEvents.delete(oldestSettled.eventId)
      }
      void (async () => {
        try {
          const batch = await toolsService.execute({
            calls: [{ type: 'tool-call', id: 'event-' + eventId, name: tool, arguments: JSON.stringify(input) }],
            signal: controller.signal,
            agent,
            maxParallelToolCalls: 1,
          })
          if (record.status === 'killed') {
            settleBackground(record, 'killed', { summary: 'stopped before completion' })
            return
          }
          const first = Array.isArray(batch.results) && batch.results.length > 0 ? batch.results[0].result : undefined
          if (first === undefined) throw new Error('the background tool produced no result')
          const text = textContentOf(first.content)
          const summary = text.length > 0 ? truncate(text, 180) : ''
          if (first.isError === true) {
            settleBackground(record, 'failed', { summary: summary || 'tool returned an error', error: summary || 'tool returned an error', output: text.slice(0, MAX_EVENT_OUTPUT_CHARS) })
          } else {
            settleBackground(record, 'completed', { summary, output: text.slice(0, MAX_EVENT_OUTPUT_CHARS) })
          }
        } catch (error) {
          if (record.status === 'killed') {
            settleBackground(record, 'killed', { summary: 'stopped before completion' })
            return
          }
          const message = truncate(String(error?.message ?? error), 300)
          settleBackground(record, 'failed', { summary: message, error: message })
        }
      })()
      return {
        action: 'run',
        event: eventPublic(record),
        note: 'Started. Keep talking to the user or do other work; the result is delivered automatically when the event finishes and starts a new round.',
      }
    },
  }

  ctx.inject(['tools'], (toolsCtx) => {
    toolsCtx.effect(function* () {
      if (config.eventEnabled) yield toolsCtx.tools.register(eventToolDefinition)
    }, 'dsh-better-tooluse: event tool')
  })

  /* -------------------------------------------------------------- http ---- */

  const readBody = (req) => new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.trim().length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })

  const sendJson = (res, status, value) => {
    const body = JSON.stringify(value)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(body)
  }

  const stream = (req, res, url) => {
    const sessionId = String(url.searchParams.get('session') ?? '')
    if (sessionId.length === 0) {
      sendJson(res, 400, { error: 'session is required' })
      return
    }
    const state = ensure(sessionId)
    if (state.events.length === 0) backfill(sessionId, state)
    lastStreamAt = Date.now()
    streamCount += 1
    state.lastStreamAt = lastStreamAt
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    })
    res.write(': better-tooluse\n\n')
    writeFrame(res, { type: 'hello', sessionId, status: state.status, events: state.events.slice(-120) })
    state.subscribers.add(res)
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n')
      } catch {
        /* closed */
      }
    }, 20_000)
    heartbeat.unref?.()
    const cleanup = () => {
      clearInterval(heartbeat)
      state.subscribers.delete(res)
    }
    req.on('close', cleanup)
    req.on('error', cleanup)
  }

  const nudge = async (req, res) => {
    let body
    try {
      body = await readBody(req)
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
      return
    }
    const sessionId = String(body?.sessionId ?? '')
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    if (sessionId.length === 0 || text.length === 0) {
      sendJson(res, 400, { ok: false, error: 'sessionId and text are required' })
      return
    }
    if (text.length > MAX_NUDGE_CHARS) {
      sendJson(res, 400, { ok: false, error: 'text too long' })
      return
    }
    const agents = ctx.get('agents')
    if (agents === undefined || typeof agents.get !== 'function') {
      sendJson(res, 503, { ok: false, error: 'agents service unavailable' })
      return
    }
    const agent = agents.get(sessionId)
    if (agent === undefined || agent === null) {
      sendJson(res, 404, { ok: false, error: 'no live agent for this session' })
      return
    }
    try {
      const message = deepFreeze({
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text }],
        source: { kind: 'user' },
      })
      const running = agent.status === 'running'
      const requestedMode = typeof body?.mode === 'string' ? body.mode : 'auto'
      const effectiveMode = requestedMode === 'steer'
        ? (running ? 'steer' : null)
        : requestedMode === 'followup'
          ? 'followup'
          : (running ? 'steer' : 'followup')
      if (effectiveMode === null) {
        sendJson(res, 409, { ok: false, code: 'not-running', error: 'session is not running; use followup mode' })
        return
      }
      if (effectiveMode === 'steer') agent.steer(message)
      else agent.followup(message)
      sendJson(res, 200, { ok: true, mode: effectiveMode })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
    }
  }

  /** Development/diagnostic channel from the browser half; bounded on disk. */
  const report = async (req, res) => {
    let body
    try {
      body = await readBody(req)
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
      return
    }
    try {
      const line = `${JSON.stringify({ at: Date.now(), ...body })}\n`
      let size = 0
      try {
        size = statSync(REPORT_PATH).size
      } catch {
        size = 0
      }
      if (size > REPORT_MAX_BYTES) truncateSync(REPORT_PATH, 0)
      appendFileSync(REPORT_PATH, line)
      sendJson(res, 200, { ok: true })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
    }
  }

  const eventsKill = async (req, res) => {
    let body
    try {
      body = await readBody(req)
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
      return
    }
    const record = backgroundEvents.get(String(body?.eventId ?? ''))
    const sessionId = String(body?.sessionId ?? '')
    if (record === undefined || record.sessionId !== sessionId) {
      sendJson(res, 404, { ok: false, error: 'unknown background event' })
      return
    }
    if (record.status === 'running') {
      record.status = 'killed'
      record.finishedAt = Date.now()
      broadcastBackground(record)
      try {
        record.controller.abort()
      } catch {
        /* already aborted */
      }
    }
    sendJson(res, 200, { ok: true, event: eventPublic(record) })
  }

  const stateRoute = (req, res, url) => {
    const sessionId = String(url.searchParams.get('session') ?? '')
    if (sessionId.length === 0) {
      sendJson(res, 200, { sessions: [...sessions.keys()] })
      return
    }
    const state = sessions.get(sessionId)
    if (state === undefined) {
      sendJson(res, 200, { sessionId, status: 'unknown', events: [] })
      return
    }
    sendJson(res, 200, { sessionId, status: state.status, events: state.events })
  }

  const handler = (req, res) => {
    let url
    try {
      url = new URL(req.url ?? '/', 'http://127.0.0.1')
    } catch {
      sendJson(res, 400, { error: 'bad url' })
      return
    }
    const sub = url.pathname.startsWith(ROUTE) ? url.pathname.slice(ROUTE.length) || '/' : null
    if (sub === '/stream' && (req.method === 'GET' || req.method === 'HEAD')) return stream(req, res, url)
    if (sub === '/nudge' && req.method === 'POST') return void nudge(req, res)
    if (sub === '/report' && req.method === 'POST') return void report(req, res)
    if (sub === '/events/kill' && req.method === 'POST') return void eventsKill(req, res)
    if (sub === '/config' && req.method === 'GET') return sendJson(res, 200, { ok: true, config: clientConfigOf(config) })
    if (sub === '/state' && req.method === 'GET') return stateRoute(req, res, url)
    if (sub === '/health' && req.method === 'GET') {
      let subscribers = 0
      for (const item of sessions.values()) subscribers += item.subscribers.size
      return sendJson(res, 200, { ok: true, sessions: sessions.size, subscribers, streamCount, lastStreamAt })
    }
    sendJson(res, 404, { error: 'not found' })
  }

  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.reflect.get('webServer')
    if (webServer === undefined || typeof webServer.register !== 'function') return
    webCtx.effect(
      () => webServer.register({ kind: 'prefix', path: ROUTE, handler }),
      'dsh-better-tooluse: routes',
    )
  })

  /** Publish the detailed protocol as an on-demand skill instead of resident prompt text. */
  ctx.inject(['skills'], (skillCtx) => {
    skillCtx.effect(() => {
      let provider = null
      try {
        const skillPath = new URL('./SKILL.md', import.meta.url)
        const skillFile = fileURLToPath(skillPath)
        const resourceBase = { kind: 'directory', path: dirname(skillFile) }
        const raw = readFileSync(skillFile, 'utf8')
        const headEnd = raw.indexOf('\n---\n', 4)
        if (!raw.startsWith('---\n') || headEnd < 0) return undefined
        const description = (raw.slice(4, headEnd).match(/^description:\s*"(.*)"\s*$/mu) ?? [])[1] ?? 'Detailed decision-stream and act/describe rules.'
        provider = {
          name: 'dsh-better-tooluse',
          list: () => Promise.resolve([{
            name: 'better-tooluse',
            description,
            invocation: { modelInvocable: true, userInvocable: true },
            source: 'bundled',
            provider: 'dsh-better-tooluse',
            path: skillFile,
            rank: 600,
            resourceBase,
            locator: skillFile,
          }]),
          get: () => Promise.resolve({
            name: 'better-tooluse',
            description,
            invocation: { modelInvocable: true, userInvocable: true },
            source: 'bundled',
            provider: 'dsh-better-tooluse',
            path: skillFile,
            rank: 600,
            resourceBase,
            locator: skillFile,
            content: raw.slice(headEnd + 5),
          }),
        }
      } catch {
        return undefined
      }
      const registered = skillCtx.skills.registerProvider(() => provider)
      return typeof registered === 'function' ? registered : undefined
    }, 'dsh-better-tooluse: protocol skill')
  })

  /** Close browser streams when this plugin unloads. */
  ctx.effect(() => () => {
    for (const record of backgroundEvents.values()) {
      if (record.status !== 'running') continue
      record.status = 'killed'
      try {
        record.controller.abort()
      } catch {
        /* already aborted */
      }
    }
    for (const state of sessions.values()) {
      for (const res of state.subscribers) {
        try {
          res.end()
        } catch {
          /* already closed */
        }
      }
      state.subscribers.clear()
    }
  }, 'dsh-better-tooluse: streams')
}

export const inject = ['systemPrompt']

export { splitDescribe, protocolLines, reasoningDigest, summarizeArgs }
