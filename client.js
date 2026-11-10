/**
 * dsh-better-tooluse — Client half (Web).
 *
 * Two surfaces over one shared live stream (single EventSource per session):
 *
 * 1. `conversation.composer.dock` — a compact "梳理" strip under the composer:
 *    status dot, latest judgement, event counts, expandable timeline, one-line
 *    纠偏 input, and a button that opens the sidebar digest tab.
 *
 * 2. better-sidebar tab `dsh-better-tooluse:digest` — the 梳理 page: goal,
 *    current direction, progress stats, per-tool usage, a step-grouped
 *    timeline, 纠偏 input, "copy digest", and a "生成梳理卡" button that asks
 *    the model to render a GenUI stage digest in the conversation.
 *
 * Data arrives over Server-Sent Events from the package's own Host route; the
 * browser half needs no generated typert artifacts and no Harness Client
 * package imports. Theme tokens come from the host (`--dsw-alias-*`).
 *
 * @module dsh-better-tooluse/client
 */
window.__ModuleLoader__.load({
  id: 'dsh-better-tooluse',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const ROUTE = '/plugins/dsh-better-tooluse'
    const TAB_ID = 'dsh-better-tooluse:digest'
    const MAX_ROWS = 200
    const STYLE_ID = 'dsh-better-tooluse-style'

    const TEXT = {
      zh: {
        title: '梳理',
        idle: '空闲',
        running: '进行中',
        empty: '发起任务后，这里会实时显示每一步判断与工具事件。',
        expand: '展开',
        collapse: '收起',
        openTab: '梳理',
        nudgePlaceholder: '一句话纠正方向，运行中将作为中途指令发送',
        nudgeSend: '纠偏',
        nudgeSent: '已发送纠偏指令',
        nudgeFailed: '纠偏发送失败',
        summarize: '生成梳理卡',
        summarizeHint: '让模型用 GenUI 输出一张阶段梳理卡',
        summarySent: '已请求生成梳理卡',
        summaryFailed: '请求失败',
        copy: '复制梳理',
        copied: '已复制',
        copyFailed: '复制失败',
        tabTitle: '梳理',
        tabDesc: '本次会话的实时工作梳理：目标、当前方向、工具使用时间线与纠偏入口。',
        goal: '目标',
        direction: '当前方向',
        noGoal: '尚未播报目标',
        noDirection: '等待第一条决策…',
        progress: '进度',
        steps: '步骤',
        toolsCount: '工具事件',
        failures: '失败',
        elapsed: '用时',
        toolUsage: '工具使用',
        noTools: '暂无工具事件',
        timeline: '时间线',
        noTimeline: '暂无事件',
        tool: '工具',
        actPending: '准备调用…',
        actDockTitle: 'act 调用 · 常驻',
        actRunning: '执行中…',
        actDockEmpty: '暂无 act 调用',
        actSection: 'act 调用',
        filterAll: '全部',
        filterRunning: '运行中',
        filterFailed: '失败',
        noResult: '（无结果文本）',
        quickPhrases: ['继续', '换个方案', '降级处理', '先停下说明'],
        modeAuto: '自动纠偏',
        modeQueue: '排队下一轮',
        noAct: '暂无 act 调用',
        eventTag: '事件',
        events: '后台事件',
        bgExpand: '查看结果',
        bgCollapse: '收起',
        bgNoOutput: '（暂无输出）',
        autoTag: '自动',
        noEvents: '暂无后台事件',
        killing: '取消失败',
        killed: '已取消',
        kill: '取消',
        killSent: '已请求取消',
        runningTool: '执行中',
        done: '完成',
        failed: '失败',
        goalTag: '目标',
        decisionTag: '决策',
        findingTag: '发现',
        adjustTag: '调整',
        thinkTag: '思考',
        userTag: '用户',
        stepLabel: '步骤',
        genuiPending: '已请求梳理卡，查看对话中的卡片',
        sessionGone: '会话不可用',
        refresh: '刷新',
      },
      en: {
        title: 'Digest',
        idle: 'Idle',
        running: 'Working',
        empty: 'Judgements and tool events will appear here as the agent works.',
        expand: 'Expand',
        collapse: 'Collapse',
        openTab: 'Digest',
        nudgePlaceholder: 'One-line correction; sent as mid-run steering while working',
        nudgeSend: 'Nudge',
        nudgeSent: 'Nudge sent',
        nudgeFailed: 'Nudge failed',
        summarize: 'GenUI digest',
        summarizeHint: 'Ask the model to render a stage digest card',
        summarySent: 'Digest card requested',
        summaryFailed: 'Request failed',
        copy: 'Copy digest',
        copied: 'Copied',
        copyFailed: 'Copy failed',
        tabTitle: 'Digest',
        tabDesc: 'Live work digest for this session: goal, current direction, tool-usage timeline and a correction box.',
        goal: 'Goal',
        direction: 'Current direction',
        noGoal: 'No goal narrated yet',
        noDirection: 'Waiting for the first decision…',
        progress: 'Progress',
        steps: 'Steps',
        toolsCount: 'Tool events',
        failures: 'Failed',
        elapsed: 'Elapsed',
        toolUsage: 'Tool usage',
        noTools: 'No tool events yet',
        timeline: 'Timeline',
        noTimeline: 'No events yet',
        tool: 'Tool',
        actPending: 'Preparing call…',
        actDockTitle: 'Act calls · pinned',
        actRunning: 'running…',
        actDockEmpty: 'No act calls yet',
        actSection: 'Act calls',
        filterAll: 'All',
        filterRunning: 'Running',
        filterFailed: 'Failed',
        noResult: '(no result text)',
        quickPhrases: ['Continue', 'Try another approach', 'Degrade gracefully', 'Stop and explain'],
        modeAuto: 'Auto nudge',
        modeQueue: 'Queue next turn',
        noAct: 'No act calls yet',
        eventTag: 'Event',
        events: 'Background events',
        bgExpand: 'View result',
        bgCollapse: 'Hide',
        bgNoOutput: '(no output)',
        autoTag: 'auto',
        noEvents: 'No background events yet',
        killing: 'Kill failed',
        killed: 'killed',
        kill: 'Kill',
        killSent: 'Kill requested',
        runningTool: 'running',
        done: 'done',
        failed: 'failed',
        goalTag: 'Goal',
        decisionTag: 'Decision',
        findingTag: 'Finding',
        adjustTag: 'Adjust',
        thinkTag: 'Thinking',
        userTag: 'User',
        stepLabel: 'Step',
        genuiPending: 'Digest card requested — check the conversation',
        sessionGone: 'Session unavailable',
        refresh: 'Refresh',
      },
    }

    function detectLocale() {
      const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en'
      return /^zh/i.test(lang) ? 'zh' : 'en'
    }

    const t = () => TEXT[detectLocale()]

    const GENUI_DIGEST_REQUEST = '请基于本次会话到目前为止的工作，输出一张「阶段梳理卡」：用 dsh-ui 围栏，最多 3 个组件（steps 显示阶段进度、callout 写当前判断与下一步，可选 list 列关键工具或发现）。不要重复原始工具输出；若原任务尚未结束，输出梳理卡后继续原任务，不要停下来等待确认。'

    /* ------------------------------------------------------------ stream -- */

    /** sessionId -> shared live store (one EventSource per session). */
    const stores = new Map()

    function notify(store) {
      for (const listener of [...store.listeners]) {
        try {
          listener()
        } catch {
          /* a broken listener must not break the others */
        }
      }
    }

    function applyFrame(store, frame) {
      if (frame.type === 'hello') {
        store.events = Array.isArray(frame.events) ? frame.events.slice(-MAX_ROWS) : []
        store.status = frame.status === 'running' ? 'running' : 'idle'
      } else if (frame.type === 'event' && frame.event !== undefined) {
        store.events.push(frame.event)
        if (store.events.length > MAX_ROWS) store.events.splice(0, store.events.length - MAX_ROWS)
      } else if (frame.type === 'update' && frame.event !== undefined) {
        const index = store.events.findIndex(item => item.id === frame.event.id)
        if (index >= 0) store.events[index] = frame.event
      } else if (frame.type === 'status') {
        store.status = frame.status === 'running' ? 'running' : 'idle'
      } else {
        return
      }
      queueNotify(store)
    }

    function connect(store) {
      if (typeof EventSource === 'undefined') return
      let source
      try {
        source = new EventSource(`${ROUTE}/stream?session=${encodeURIComponent(store.sessionId)}`)
      } catch {
        return
      }
      store.source = source
      source.onopen = () => {
        store.attempts = 0
      }
      source.onmessage = (message) => {
        let frame
        try {
          frame = JSON.parse(message.data)
        } catch {
          return
        }
        applyFrame(store, frame)
      }
      source.onerror = () => {
        /* HTTP failures and Host reloads end EventSource permanently, so rebuild it. */
        try {
          source.close()
        } catch {
          /* already closed */
        }
        if (store.source !== source) return
        store.source = null
        if (store.listeners.size === 0) return
        store.attempts += 1
        const delay = Math.min(15_000, 800 * store.attempts)
        store.retryTimer = setTimeout(() => {
          store.retryTimer = null
          if (store.listeners.size > 0) connect(store)
        }, delay)
      }
    }

    function acquireStore(sessionId, listener) {
      let store = stores.get(sessionId)
      if (store === undefined) {
        store = { sessionId, events: [], status: 'idle', listeners: new Set(), source: null, retryTimer: null, attempts: 0 }
        stores.set(sessionId, store)
        connect(store)
      }
      store.listeners.add(listener)
      return store
    }

    function releaseStore(sessionId, listener) {
      const store = stores.get(sessionId)
      if (store === undefined) return
      store.listeners.delete(listener)
      if (store.listeners.size > 0) return
      if (store.retryTimer !== null) {
        clearTimeout(store.retryTimer)
        store.retryTimer = null
      }
      if (store.source !== null) {
        try {
          store.source.close()
        } catch {
          /* already closed */
        }
        store.source = null
      }
      stores.delete(sessionId)
    }

    function useLiveStore(sessionId) {
      const holder = React.useRef(null)
      const [, bump] = React.useReducer(value => value + 1, 0)
      React.useEffect(() => {
        if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
        const listener = () => bump()
        holder.current = acquireStore(sessionId, listener)
        bump()
        return () => {
          releaseStore(sessionId, listener)
          holder.current = null
        }
      }, [sessionId])
      return holder.current
    }

    /* ---------------------------------------------------------- app config -- */

    const DEFAULT_CLIENT_CONFIG = { showDockStrip: true, showActCards: true, actCardLimit: 10 }
    let clientConfig = { ...DEFAULT_CLIENT_CONFIG }
    const configListeners = new Set()

    function loadClientConfig() {
      try {
        void fetch(`${ROUTE}/config`)
          .then(response => (response.ok ? response.json() : null))
          .then(payload => {
            if (payload !== null && typeof payload === 'object' && payload.config !== undefined) {
              clientConfig = { ...DEFAULT_CLIENT_CONFIG, ...payload.config }
              for (const listener of [...configListeners]) listener()
            }
          })
          .catch(() => {})
      } catch {
        /* config is optional */
      }
    }

    function useClientConfig() {
      const [, bump] = React.useReducer(value => value + 1, 0)
      React.useEffect(() => {
        const listener = () => bump()
        configListeners.add(listener)
        return () => configListeners.delete(listener)
      }, [])
      return clientConfig
    }

    /** Coalesce a frame burst into one React notification per task. */
    function queueNotify(store) {
      if (store.notifyScheduled === true) return
      store.notifyScheduled = true
      queueMicrotask(() => {
        store.notifyScheduled = false
        notify(store)
      })
    }

    /* ------------------------------------------------------------ helpers -- */

    function report(payload) {
      try {
        void fetch(`${ROUTE}/report`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {})
      } catch {
        /* diagnostics are best-effort */
      }
    }

    function elapsed(events, status) {
      const times = events.map(event => event.time).filter(time => typeof time === 'number')
      if (times.length === 0) return 0
      const first = Math.min(...times)
      const last = status === 'running' ? Date.now() : Math.max(...times)
      return Math.max(0, last - first)
    }

    function truncateText(text, max) {
      const flat = String(text).replace(/\s+/g, ' ').trim()
      return flat.length <= max ? flat : flat.slice(0, max - 1) + '…'
    }

    function formatDuration(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return '0s'
      const total = Math.round(ms / 1000)
      if (total < 60) return `${total}s`
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      if (minutes < 60) return `${minutes}m ${seconds}s`
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    }

    function buildDigest(events) {
      const goal = []
      const decisions = []
      const findings = []
      const adjusts = []
      const tools = []
      const users = []
      const steps = new Map()
      for (const event of events) {
        switch (event.kind) {
          case 'goal': goal.push(event); break
          case 'decision': decisions.push(event); break
          case 'finding': findings.push(event); break
          case 'adjust': adjusts.push(event); break
          case 'tool': tools.push(event); break
          case 'user': users.push(event); break
          default: break
        }
        if (event.kind === 'turn' || event.kind === 'user') continue
        const key = `${event.turn ?? 0}:${event.step ?? 0}`
        let group = steps.get(key)
        if (group === undefined) {
          group = { key, turn: event.turn ?? 0, step: event.step ?? 0, events: [], firstTime: event.time }
          steps.set(key, group)
        }
        group.events.push(event)
        if (typeof event.time === 'number' && (group.firstTime === undefined || event.time < group.firstTime)) group.firstTime = event.time
      }
      const usage = new Map()
      for (const event of tools) {
        const name = event.tool || 'tool'
        let item = usage.get(name)
        if (item === undefined) {
          item = { name, count: 0, failed: 0, running: 0, ms: 0 }
          usage.set(name, item)
        }
        item.count += 1
        if (event.status === 'failed') item.failed += 1
        else if (event.status === 'running') item.running += 1
        if (typeof event.time === 'number' && typeof event.endedAt === 'number') item.ms += Math.max(0, event.endedAt - event.time)
      }
      const usageList = [...usage.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      const maxCount = usageList.reduce((max, item) => Math.max(max, item.count), 1)
      return {
        goal: goal.length > 0 ? goal[goal.length - 1] : null,
        decisions,
        findings,
        adjusts,
        tools,
        users,
        steps: [...steps.values()].sort((a, b) => (a.turn - b.turn) || (a.step - b.step)),
        usage: usageList,
        maxCount,
        failed: tools.filter(event => event.status === 'failed').length,
        running: tools.filter(event => event.status === 'running').length,
      }
    }

    function digestMarkdown(digest, sessionId) {
      const lines = []
      lines.push(`# 梳理 · ${String(sessionId).slice(0, 18)}`)
      lines.push('')
      lines.push(`## 目标`)
      lines.push(digest.goal === null ? '（尚未播报）' : digest.goal.text)
      lines.push('')
      const lastDecision = digest.decisions.length > 0 ? digest.decisions[digest.decisions.length - 1] : null
      const lastFinding = digest.findings.length > 0 ? digest.findings[digest.findings.length - 1] : null
      lines.push(`## 当前方向`)
      if (lastDecision === null && lastFinding === null) lines.push('（等待第一条决策）')
      if (lastDecision !== null) lines.push(`- 决策：${lastDecision.text}`)
      if (lastFinding !== null) lines.push(`- 发现：${lastFinding.text}`)
      lines.push('')
      if (digest.usage.length > 0) {
        lines.push(`## 工具使用`)
        for (const item of digest.usage) {
          const extra = item.failed > 0 ? `，失败 ${item.failed}` : ''
          lines.push(`- ${item.name} × ${item.count}（${formatDuration(item.ms)}${extra}）`)
        }
        lines.push('')
      }
      lines.push(`## 时间线`)
      for (const group of digest.steps) {
        lines.push(`### 步骤 ${group.turn}.${group.step}`)
        for (const event of group.events) {
          if (event.kind === 'tool') lines.push(`- 工具 ${event.tool}（${event.status}）`)
          else if (event.kind === 'think') lines.push(`- 思考：${event.text}`)
          else if (event.text !== undefined) lines.push(`- ${event.label || event.kind}：${event.text}`)
        }
      }
      return lines.join('\n')
    }

    function postNudge(sessionId, text, mode = 'auto') {
      return fetch(`${ROUTE}/nudge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, text, mode }),
      }).then(async response => {
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result.ok) throw new Error(result.error || String(response.status))
        return result
      })
    }

    function openDigest(ctx, sessionId) {
      const service = ctx.get('betterSidebar')
      if (service === undefined || typeof service.openTab !== 'function') return false
      try {
        service.openTab({ type: TAB_ID, title: t().tabTitle }, sessionId ? { sessionId } : undefined)
        return true
      } catch {
        return false
      }
    }

    /* -------------------------------------------------------------- icons -- */

    function Icon(props) {
      const size = props.size || 16
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M3 3.2h10M3 8h10M3 12.8h6', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
      )
    }

    function IconTarget(props) {
      const size = props.size || 14
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 8, cy: 8, r: 5.4, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('circle', { cx: 8, cy: 8, r: 2, fill: 'currentColor' }),
      )
    }

    function IconSpark(props) {
      const size = props.size || 14
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M8 1.6l1.5 4.3 4.3 1.5-4.3 1.5L8 13.2 6.5 8.9 2.2 7.4l4.3-1.5L8 1.6z', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }),
      )
    }

    /* --------------------------------------------------------------- style -- */

    const CSS = `
.dsb-root { box-sizing: border-box; width: 100%; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.5; }
.dsb-head { display: flex; align-items: center; gap: 8px; min-height: 28px; padding: 3px 10px; cursor: pointer; user-select: none; }
.dsb-dot { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); }
.dsb-dot.dsb-running { background: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
.dsb-title { flex: 0 0 auto; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsb-latest { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-count { flex: 0 0 auto; font-variant-numeric: tabular-nums; opacity: .75; }
.dsb-btn { flex: 0 0 auto; border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; padding: 2px 8px; border-radius: 7px; cursor: pointer; }
.dsb-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.dsb-btn.dsb-primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-bg-base); }
.dsb-btn.dsb-primary:hover { filter: brightness(1.05); }
.dsb-btn:disabled { opacity: .5; cursor: default; }
.dsb-body { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--dsw-alias-border-l1); padding: 8px 10px 10px; }
.dsb-list { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow: auto; overscroll-behavior: contain; }
.dsb-row { display: flex; gap: 6px; align-items: baseline; }
.dsb-tag { flex: 0 0 auto; min-width: 46px; font-weight: 600; font-size: 11px; opacity: .92; }
.dsb-tag.dsb-goal { color: var(--dsw-alias-brand-primary); }
.dsb-tag.dsb-decision { color: var(--dsw-alias-state-warn-primary); }
.dsb-tag.dsb-finding { color: var(--dsw-alias-state-success-primary); }
.dsb-tag.dsb-adjust { color: var(--dsw-alias-state-error-primary); }
.dsb-tag.dsb-tool { color: var(--dsw-alias-label-secondary); }
.dsb-tag.dsb-user { color: var(--dsw-alias-brand-primary); }
.dsb-tag.dsb-think { color: var(--dsw-alias-label-secondary); opacity: .7; }
.dsb-text { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-primary); word-break: break-word; white-space: pre-wrap; }
.dsb-text.dsb-dim { color: var(--dsw-alias-label-secondary); opacity: .85; }
.dsb-sub { display: block; margin-top: 1px; color: var(--dsw-alias-label-secondary); opacity: .8; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-chip { flex: 0 0 auto; font-size: 10px; padding: 0 6px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); }
.dsb-chip.dsb-run { color: var(--dsw-alias-brand-primary); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent); }
.dsb-chip.dsb-ok { color: var(--dsw-alias-state-success-primary); }
.dsb-chip.dsb-err { color: var(--dsw-alias-state-error-primary); }
.dsb-nudge { display: flex; gap: 6px; }
.dsb-input { flex: 1 1 auto; min-width: 0; box-sizing: border-box; padding: 5px 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; outline: none; }
.dsb-input:focus { border-color: var(--dsw-alias-brand-primary); }
.dsb-note { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dsb-note.dsb-err { color: var(--dsw-alias-state-error-primary); }
.dsb-empty { padding: 2px 0; color: var(--dsw-alias-label-secondary); opacity: .8; }

.dsb-tab { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 0; overflow: hidden; font-size: 12px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-base); }
.dsb-tab-head { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 10px 12px 6px; }
.dsb-tab-head .dsb-title { font-size: 13px; }
.dsb-tab-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 0 12px 10px; display: flex; flex-direction: column; gap: 10px; }
.dsb-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
.dsb-card-title { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; letter-spacing: .02em; color: var(--dsw-alias-label-secondary); text-transform: uppercase; }
.dsb-card-body { color: var(--dsw-alias-label-primary); white-space: pre-wrap; word-break: break-word; }
.dsb-card.dsb-goal-card { border-left: 3px solid var(--dsw-alias-brand-primary); }
.dsb-dir-main { color: var(--dsw-alias-label-primary); }
.dsb-dir-sub { color: var(--dsw-alias-label-secondary); opacity: .9; }
.dsb-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.dsb-stat { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 6px 8px; background: var(--dsw-alias-bg-layer-1); display: flex; flex-direction: column; gap: 1px; }
.dsb-stat b { font-size: 15px; font-weight: 650; color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; }
.dsb-stat span { font-size: 10px; opacity: .8; }
.dsb-usage { display: flex; flex-direction: column; gap: 5px; }
.dsb-usage-row { display: grid; grid-template-columns: 92px 1fr auto; gap: 8px; align-items: center; }
.dsb-usage-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }
.dsb-bar { position: relative; height: 6px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.dsb-bar i { position: absolute; inset: 0 auto 0 0; border-radius: 999px; background: var(--dsw-alias-brand-primary); opacity: .8; }
.dsb-usage-meta { font-variant-numeric: tabular-nums; white-space: nowrap; }
.dsb-usage-meta .dsb-err { color: var(--dsw-alias-state-error-primary); }
.dsb-step { display: flex; flex-direction: column; gap: 3px; padding: 6px 0 2px; }
.dsb-step:not(:first-child) { border-top: 1px dashed var(--dsw-alias-border-l1); }
.dsb-step-title { font-size: 10px; font-weight: 600; letter-spacing: .02em; opacity: .7; text-transform: uppercase; }
.dsb-tab-foot { flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px; padding: 8px 12px 12px; border-top: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); }
.dsb-foot-row { display: flex; gap: 6px; }
.dsb-foot-row .dsb-btn { white-space: nowrap; }
.dsb-foot-row .dsb-btn { padding: 4px 10px; }
.dsb-spacer { flex: 1 1 auto; }
.dsb-scroll-hint { font-size: 11px; opacity: .7; }
.dsb-bg-list { display: flex; flex-direction: column; gap: 5px; }
.dsb-bg-item { display: flex; flex-direction: column; gap: 3px; padding: 6px 8px; border: 1px solid var(--dsw-alias-border-l1); border-left: 2px solid var(--dsw-alias-brand-primary); border-radius: 7px; background: var(--dsw-alias-bg-base); }
.dsb-bg-head { display: flex; align-items: center; gap: 6px; }
.dsb-bg-label { font-weight: 600; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 46%; }
.dsb-bg-meta { margin-left: auto; font-variant-numeric: tabular-nums; opacity: .75; font-size: 11px; }
.dsb-bg-summary { color: var(--dsw-alias-label-secondary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-bg-pre { margin: 2px 0 0; max-height: 200px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-family: var(--dsw-font-mono, monospace); font-size: 11px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); border-radius: 6px; padding: 6px; }

.dsb-act { box-sizing: border-box; display: flex; flex-direction: column; gap: 3px; border: 1px solid var(--dsw-alias-border-l1); border-left: 3px solid var(--dsw-alias-brand-primary); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); padding: 6px 9px; font-size: 12px; line-height: 1.5; }
.dsb-act-head { display: flex; align-items: center; gap: 8px; }
.dsb-act-tool { font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsb-act-desc { color: var(--dsw-alias-label-secondary); word-break: break-word; }
.dsb-act-pending { opacity: .7; }
.dsb-actdock { box-sizing: border-box; display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); padding: 7px 10px 8px; max-height: 210px; overflow: auto; overscroll-behavior: contain; font-size: 12px; line-height: 1.5; }
.dsb-actdock-head { display: flex; align-items: center; gap: 8px; }
.dsb-actdock-title { font-weight: 600; color: var(--dsw-alias-label-primary); font-size: 11px; letter-spacing: .02em; text-transform: uppercase; }
.dsb-actdock-count { margin-left: auto; font-variant-numeric: tabular-nums; opacity: .7; }
.dsb-act-item { display: flex; flex-direction: column; gap: 2px; padding: 5px 7px; border: 1px solid var(--dsw-alias-border-l1); border-left: 2px solid var(--dsw-alias-brand-primary); border-radius: 7px; background: var(--dsw-alias-bg-base); }
.dsb-act-item-head { display: flex; align-items: center; gap: 6px; }
.dsb-act-item-tool { font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsb-act-item-thinking { color: var(--dsw-alias-label-primary); }
.dsb-act-item-purpose { color: var(--dsw-alias-label-secondary); }
.dsb-act-item-result { color: var(--dsw-alias-label-secondary); opacity: .8; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-actrow { box-sizing: border-box; display: flex; flex-direction: column; gap: 2px; margin: 4px 0; padding: 7px 10px; border: 1px solid var(--dsw-alias-border-l1); border-left: 3px solid var(--dsw-alias-brand-primary); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); font-size: 12px; line-height: 1.5; }
.dsb-actrow-head { display: flex; align-items: center; gap: 7px; }
.dsb-actrow-tool { font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsb-actrow-thinking { color: var(--dsw-alias-label-primary); }
.dsb-actrow-purpose { color: var(--dsw-alias-label-secondary); }
.dsb-actrow-result { color: var(--dsw-alias-label-secondary); opacity: .8; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-actcards { display: flex; flex-direction: column; gap: 6px; }
.dsb-actcard { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border: 1px solid var(--dsw-alias-border-l1); border-left: 2px solid var(--dsw-alias-brand-primary); border-radius: 7px; background: var(--dsw-alias-bg-base); }
.dsb-actcard-head { display: flex; align-items: center; gap: 7px; }
.dsb-actcard-tool { font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsb-actcard-ms { margin-left: auto; font-size: 10px; opacity: .7; font-variant-numeric: tabular-nums; }
.dsb-actcard-thinking { color: var(--dsw-alias-label-primary); font-size: 12px; }
.dsb-actcard-purpose { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.dsb-actcard-result { color: var(--dsw-alias-label-secondary); opacity: .8; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-actfilter { display: flex; gap: 5px; margin: 2px 0 6px; }
.dsb-filter-chip { border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; padding: 1px 8px; border-radius: 999px; cursor: pointer; }
.dsb-filter-chip.dsb-on { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-bg-base); }
.dsb-filter-chip:disabled { opacity: .5; cursor: default; }
.dsb-actcard-head { cursor: pointer; }
.dsb-actcard-more { margin-left: auto; opacity: .6; font-weight: 600; }
.dsb-actcard-full { margin-top: 5px; padding-top: 5px; border-top: 1px dashed var(--dsw-alias-border-l1); display: flex; flex-direction: column; gap: 4px; }
.dsb-actcard-args { font-size: 11px; color: var(--dsw-alias-label-secondary); opacity: .85; word-break: break-word; }
.dsb-actcard-pre { margin: 0; max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-family: var(--dsw-font-mono, monospace); font-size: 11px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); border-radius: 6px; padding: 6px; }
.dsb-quick { display: flex; gap: 5px; flex-wrap: wrap; }
.dsb-select { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; padding: 4px 6px; }

/* Keep long tool names, args and results inside the sidebar panel: every flex
   child must be shrinkable and every free-form text block must be breakable. */
.dsb-tab, .dsb-tab-scroll, .dsb-actcards, .dsb-actcard, .dsb-act, .dsb-actdock, .dsb-act-item, .dsb-actrow, .dsb-bg-item, .dsb-bg-list, .dsb-card, .dsb-usage, .dsb-stats { min-width: 0; max-width: 100%; }
.dsb-tab-scroll { overflow-x: hidden; }
.dsb-tab-scroll > * { min-width: 0; max-width: 100%; }
.dsb-actcard, .dsb-act, .dsb-actdock, .dsb-act-item, .dsb-actrow, .dsb-bg-item, .dsb-card { overflow-x: hidden; }
.dsb-actcard-head, .dsb-act-item-head, .dsb-actrow-head, .dsb-act-head, .dsb-bg-head, .dsb-actdock-head { min-width: 0; flex-wrap: nowrap; }
.dsb-actcard-tool, .dsb-act-item-tool, .dsb-actrow-tool, .dsb-act-tool, .dsb-bg-label, .dsb-usage-name { min-width: 0; flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-actcard-ms, .dsb-actdock-count, .dsb-bg-meta, .dsb-actcard-more, .dsb-chip { flex: 0 0 auto; }
.dsb-actcard-thinking, .dsb-actcard-purpose, .dsb-actcard-args, .dsb-act-item-thinking, .dsb-act-item-purpose, .dsb-act-desc, .dsb-actrow-thinking, .dsb-actrow-purpose, .dsb-bg-summary, .dsb-scroll-hint { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
.dsb-actcard-pre, .dsb-bg-pre, .dsb-act-item-result, .dsb-actrow-result, .dsb-actcard-result { min-width: 0; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; }
.dsb-act-item-result, .dsb-actrow-result, .dsb-actcard-result { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

`

    function eventView(event, tr) {
      if (event.kind === 'tool') {
        const chip = event.status === 'running' ? tr.runningTool : event.status === 'failed' ? tr.failed : tr.done
        const chipTone = event.status === 'running' ? 'dsb-run' : event.status === 'failed' ? 'dsb-err' : 'dsb-ok'
        const purpose = event.describe !== undefined && event.describe.purpose ? '作用：' + event.describe.purpose : ''
        const sub = event.status === 'running'
          ? [purpose, event.args].filter(Boolean).join(' · ')
          : [purpose, event.summary || event.args, event.outcome].filter(Boolean).join(' · ')
        return { tag: tr.tool, tone: 'tool', text: event.tool, sub, chip, chipTone }
      }
      if (event.kind === 'background') {
        const state = event.status === 'running' ? tr.runningTool : event.status === 'killed' ? tr.killed : event.status === 'failed' ? tr.failed : tr.done
        const chipTone = event.status === 'running' ? 'dsb-run' : event.status === 'killed' ? '' : event.status === 'failed' ? 'dsb-err' : 'dsb-ok'
        const sub = [event.args, event.summary || event.error].filter(Boolean).join(' · ')
        return { tag: tr.eventTag, tone: 'tool', text: event.label || event.tool, sub, chip: state, chipTone }
      }
      if (event.kind === 'user') return { tag: tr.userTag, tone: 'user', text: event.text }
      if (event.kind === 'turn') return null
      const tag = { goal: tr.goalTag, decision: tr.decisionTag, finding: tr.findingTag, adjust: tr.adjustTag, think: tr.thinkTag }[event.kind]
        || event.label
        || event.kind
      if (event.kind === 'decision' && (event.thinking !== undefined || event.purpose !== undefined)) {
        return {
          tag,
          tone: 'decision',
          text: event.thinking !== undefined ? event.thinking : event.text,
          sub: event.purpose !== undefined && event.purpose.length > 0 ? '作用：' + event.purpose : undefined,
        }
      }
      return { tag, tone: event.kind === 'goal' ? 'goal' : event.kind === 'decision' ? 'decision' : event.kind === 'finding' ? 'finding' : event.kind === 'adjust' ? 'adjust' : 'think', text: event.text, dim: event.kind === 'think' }
    }

    function EventRow(props) {
      const { view } = props
      return h('div', { className: 'dsb-row' },
        h('span', { className: `dsb-tag dsb-${view.tone}` }, view.tag),
        h('span', { className: `dsb-text${view.dim ? ' dsb-dim' : ''}` },
          view.text,
          view.sub ? h('span', { className: 'dsb-sub' }, view.sub) : null,
        ),
        view.chip ? h('span', { className: `dsb-chip ${view.chipTone}` }, view.chip) : null,
      )
    }

    /* ------------------------------------------------------------ dock UI -- */

    function DockStrip(props) {
      const tr = t()
      const css = useClientConfig()
      const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
      const store = useLiveStore(sessionId)
      const [expanded, setExpanded] = React.useState(false)
      const [draft, setDraft] = React.useState('')
      const [note, setNote] = React.useState(null)
      const [sending, setSending] = React.useState(false)
      const reportedRef = React.useRef(false)
      const helloRef = React.useRef(false)

      React.useEffect(() => {
        if (reportedRef.current) return
        reportedRef.current = true
        report({ type: 'mount', v: 4, surface: 'dock', sessionIdPresent: sessionId.length > 0, props: Object.keys(props).slice(0, 60) })
      }, [])

      React.useEffect(() => {
        if (store === null || store === undefined || helloRef.current) return
        if (store.events.length === 0 && store.status !== 'running') return
        helloRef.current = true
        report({ type: 'hello', v: 4, surface: 'dock', sessionId, events: store.events.length, status: store.status })
      }, [store, store === null || store === undefined ? 0 : store.events.length])

      const rows = []
      if (store !== null && store !== undefined) {
        for (const event of store.events.slice(-MAX_ROWS)) {
          const view = eventView(event, tr)
          if (view !== null) rows.push({ id: event.id, ...view })
        }
      }

      const latest = rows.length > 0 ? rows[rows.length - 1] : null
      const status = store === null || store === undefined ? 'idle' : store.status
      const toolCount = store === null || store === undefined ? 0 : store.events.filter(event => event.kind === 'tool').length

      const send = async () => {
        const text = draft.trim()
        if (text.length === 0 || sending || sessionId.length === 0) return
        setSending(true)
        setNote(null)
        try {
          await postNudge(sessionId, text, nudgeMode)
          setDraft('')
          setNote({ tone: '', text: tr.nudgeSent })
        } catch (error) {
          setNote({ tone: 'dsb-err', text: `${tr.nudgeFailed}: ${String(error && error.message ? error.message : error)}` })
        } finally {
          setSending(false)
        }
      }

      if (sessionId.length === 0 || !css.showDockStrip) return null

      const openDigestTab = (event) => {
        event.stopPropagation()
        if (!openDigest(props.host, sessionId)) setExpanded(true)
      }

      return h('div', { className: 'dsb-root', 'data-dsh-better-tooluse': 'dock' },
        h('div', {
          className: 'dsb-head',
          role: 'button',
          tabIndex: 0,
          'aria-expanded': expanded,
          onClick: () => setExpanded(value => !value),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setExpanded(value => !value)
            }
          },
        },
          h('span', { className: `dsb-dot${status === 'running' ? ' dsb-running' : ''}` }),
          h('span', { className: 'dsb-title' }, tr.title),
          latest === null
            ? h('span', { className: 'dsb-latest' }, status === 'running' ? tr.running : tr.empty)
            : h('span', { className: 'dsb-latest' }, `${latest.tag} · ${latest.text}${latest.sub ? ` — ${latest.sub}` : ''}`),
          h('span', { className: 'dsb-count' }, toolCount > 0 ? `${toolCount} ${tr.toolsCount}` : ''),
          h('button', { className: 'dsb-btn', type: 'button', onClick: openDigestTab, title: tr.tabDesc }, tr.openTab),
          h('span', { className: 'dsb-btn' }, expanded ? tr.collapse : tr.expand),
        ),
        expanded
          ? h('div', { className: 'dsb-body' },
            h('div', { className: 'dsb-list', role: 'log', 'aria-live': 'polite' },
              rows.length === 0
                ? h('div', { className: 'dsb-empty' }, tr.empty)
                : rows.map(row => h('div', { className: 'dsb-row', key: row.id },
                  h('span', { className: `dsb-tag dsb-${row.tone}` }, row.tag),
                  h('span', { className: `dsb-text${row.dim ? ' dsb-dim' : ''}` },
                    row.text,
                    row.sub ? h('span', { className: 'dsb-sub' }, row.sub) : null,
                  ),
                  row.chip ? h('span', { className: `dsb-chip ${row.chipTone}` }, row.chip) : null,
                )),
            ),
            h('div', { className: 'dsb-nudge' },
              h('input', {
                className: 'dsb-input',
                value: draft,
                placeholder: tr.nudgePlaceholder,
                disabled: sending,
                onChange: event => setDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) void send()
                },
              }),
              h('button', { className: 'dsb-btn dsb-primary', type: 'button', disabled: sending || draft.trim().length === 0, onClick: () => void send() }, tr.nudgeSend),
            ),
            note !== null ? h('div', { className: `dsb-note ${note.tone}` }, note.text) : null,
          )
          : null,
      )
    }

    /* ------------------------------------------------------------- tab UI -- */

    function DigestTab(props) {
      const tr = t()
      const css = useClientConfig()
      const sessionId = props && props.scope ? String(props.scope.sessionId || '') : ''
      const store = useLiveStore(sessionId)
      const [draft, setDraft] = React.useState('')
      const [note, setNote] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [actFilter, setActFilter] = React.useState('all')
      const [expandedAct, setExpandedAct] = React.useState(null)
      const [expandedBg, setExpandedBg] = React.useState(null)
      const [nudgeMode, setNudgeMode] = React.useState('auto')
      const [toolFilter, setToolFilter] = React.useState('all')
      const reportedRef = React.useRef(false)

      React.useEffect(() => {
        if (reportedRef.current) return
        reportedRef.current = true
        report({ type: 'mount', v: 4, surface: 'tab', sessionIdPresent: sessionId.length > 0 })
      }, [])

      const events = store === null || store === undefined ? [] : store.events
      const status = store === null || store === undefined ? 'idle' : store.status
      const digest = buildDigest(events)
      const statusLabel = status === 'running' ? tr.running : tr.idle
      const lastDecision = digest.decisions.length > 0 ? digest.decisions[digest.decisions.length - 1] : null
      const lastFinding = digest.findings.length > 0 ? digest.findings[digest.findings.length - 1] : null
      const background = events.filter(event => event.kind === 'background')
      const actEvents = events.filter(event => event.kind === 'tool' && event.via === 'act')
      const actTools = [...new Set(actEvents.map(event => event.tool))].slice(0, 6)
      const actCalls = actEvents
        .filter(event => actFilter === 'all' || (actFilter === 'running' ? event.status === 'running' : event.status === 'failed'))
        .filter(event => toolFilter === 'all' || event.tool === toolFilter)
        .sort((a, b) => (a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1) || (b.time || 0) - (a.time || 0))
        .slice(0, css.actCardLimit)

      const killEvent = async (eventId) => {
        try {
          const response = await fetch(`${ROUTE}/events/kill`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId, eventId }),
          })
          const result = await response.json().catch(() => ({}))
          if (!response.ok || !result.ok) throw new Error(result.error || String(response.status))
          setNote({ tone: '', text: tr.killSent })
        } catch (error) {
          setNote({ tone: 'dsb-err', text: `${tr.killing}: ${String(error && error.message ? error.message : error)}` })
        }
      }

      const nudge = async () => {
        const text = draft.trim()
        if (text.length === 0 || busy || sessionId.length === 0) return
        setBusy(true)
        setNote(null)
        try {
          await postNudge(sessionId, text)
          setDraft('')
          setNote({ tone: '', text: tr.nudgeSent })
        } catch (error) {
          setNote({ tone: 'dsb-err', text: `${tr.nudgeFailed}: ${String(error && error.message ? error.message : error)}` })
        } finally {
          setBusy(false)
        }
      }

      const summarize = async () => {
        if (busy || sessionId.length === 0) return
        setBusy(true)
        setNote(null)
        try {
          await postNudge(sessionId, GENUI_DIGEST_REQUEST)
          setNote({ tone: '', text: tr.summarySent })
        } catch (error) {
          setNote({ tone: 'dsb-err', text: `${tr.summaryFailed}: ${String(error && error.message ? error.message : error)}` })
        } finally {
          setBusy(false)
        }
      }

      const copy = async () => {
        try {
          await navigator.clipboard.writeText(digestMarkdown(digest, sessionId))
          setNote({ tone: '', text: tr.copied })
        } catch {
          setNote({ tone: 'dsb-err', text: tr.copyFailed })
        }
      }

      if (sessionId.length === 0) {
        return h('div', { className: 'dsb-tab' }, h('div', { className: 'dsb-tab-head' }, h('span', { className: 'dsb-title' }, tr.title)), h('div', { className: 'dsb-tab-scroll' }, h('div', { className: 'dsb-empty' }, tr.sessionGone)))
      }

      const stat = (label, value) => h('div', { className: 'dsb-stat' }, h('b', null, String(value)), h('span', null, label))

      return h('div', { className: 'dsb-tab' },
        h('div', { className: 'dsb-tab-head' },
          h('span', { className: `dsb-dot${status === 'running' ? ' dsb-running' : ''}` }),
          h('span', { className: 'dsb-title' }, tr.title),
          h('span', { className: 'dsb-chip' }, statusLabel),
          h('span', { className: 'dsb-spacer' }),
          h('button', { className: 'dsb-btn dsb-primary', type: 'button', disabled: busy, onClick: () => void summarize(), title: tr.summarizeHint }, tr.summarize),
        ),
        h('div', { className: 'dsb-tab-scroll' },
          (css.showActCards
            ? h('div', { className: 'dsb-card' },
              h('div', { className: 'dsb-card-title' }, h(Icon, null), tr.actSection),
              h('div', { className: 'dsb-actfilter' },
                ['all', 'running', 'failed'].map(key => h('button', {
                  key,
                  type: 'button',
                  className: 'dsb-filter-chip' + (actFilter === key ? ' dsb-on' : ''),
                  onClick: () => setActFilter(key),
                }, key === 'all' ? tr.filterAll : key === 'running' ? tr.filterRunning : tr.filterFailed)),
              ),
              actTools.length > 1
                ? h('div', { className: 'dsb-actfilter' },
                  [['all', tr.filterAll]].concat(actTools.map(tool => [tool, tool])).map(entry => h('button', {
                    key: entry[0],
                    type: 'button',
                    className: 'dsb-filter-chip' + (toolFilter === entry[0] ? ' dsb-on' : ''),
                    onClick: () => setToolFilter(entry[0]),
                  }, entry[1])),
                )
                : null,
              actCalls.length === 0
                ? h('div', { className: 'dsb-card-body dsb-dir-sub' }, tr.noAct)
                : h('div', { className: 'dsb-actcards' },
                  actCalls.map(event => {
                    const describe = event.describe || {}
                    const state = event.status === 'running' ? tr.runningTool : event.status === 'failed' ? tr.failed : tr.done
                    const tone = event.status === 'running' ? 'dsb-run' : event.status === 'failed' ? 'dsb-err' : 'dsb-ok'
                    const duration = typeof event.time === 'number' && typeof event.endedAt === 'number' ? formatDuration(event.endedAt - event.time) : ''
                    const expanded = expandedAct === event.id
                    return h('div', { className: 'dsb-actcard', key: event.id },
                      h('div', {
                        className: 'dsb-actcard-head',
                        role: 'button',
                        tabIndex: 0,
                        onClick: () => setExpandedAct(expanded ? null : event.id),
                        onKeyDown: (press) => {
                          if (press.key === 'Enter' || press.key === ' ') {
                            press.preventDefault()
                            setExpandedAct(expanded ? null : event.id)
                          }
                        },
                      },
                        h('span', { className: 'dsb-actcard-tool' }, event.tool),
                        h('span', { className: 'dsb-chip ' + tone }, state),
                        duration ? h('span', { className: 'dsb-actcard-ms' }, duration) : null,
                        h('span', { className: 'dsb-actcard-more' }, expanded ? '−' : '+'),
                      ),
                      describe.thinking ? h('div', { className: 'dsb-actcard-thinking' }, describe.thinking) : null,
                      describe.purpose ? h('div', { className: 'dsb-actcard-purpose' }, '作用：' + describe.purpose) : null,
                      event.status === 'running'
                        ? h('div', { className: 'dsb-actcard-result' }, tr.actRunning)
                        : (event.summary ? h('div', { className: 'dsb-actcard-result' }, event.summary) : null),
                      expanded
                        ? h('div', { className: 'dsb-actcard-full' },
                          event.args ? h('div', { className: 'dsb-actcard-args' }, '参数：' + event.args) : null,
                          event.resultText || event.summary
                            ? h('pre', { className: 'dsb-actcard-pre' }, event.resultText || event.summary)
                            : h('div', { className: 'dsb-card-body dsb-dir-sub' }, tr.noResult),
                        )
                        : null,
                    )
                  }),
                ),
            )
            : null),
          h('div', { className: 'dsb-card dsb-goal-card' },
            h('div', { className: 'dsb-card-title' }, h(IconTarget, null), tr.goal),
            h('div', { className: 'dsb-card-body' }, digest.goal === null ? tr.noGoal : digest.goal.text),
          ),
          h('div', { className: 'dsb-card' },
            h('div', { className: 'dsb-card-title' }, h(IconSpark, null), tr.direction),
            lastDecision === null && lastFinding === null
              ? h('div', { className: 'dsb-card-body dsb-dir-sub' }, tr.noDirection)
              : h('div', { className: 'dsb-card-body' },
                lastDecision !== null ? h('div', { className: 'dsb-dir-main' }, `▸ ${lastDecision.text}`) : null,
                lastFinding !== null ? h('div', { className: 'dsb-dir-sub' }, `↳ ${lastFinding.text}`) : null,
              ),
          ),
          h('div', { className: 'dsb-stats' },
            stat(tr.steps, digest.steps.length),
            stat(tr.toolsCount, digest.tools.length),
            stat(tr.failures, digest.failed),
            stat(tr.elapsed, formatDuration(elapsed(events, status))),
          ),
          background.length > 0
            ? h('div', { className: 'dsb-card' },
              h('div', { className: 'dsb-card-title' }, h(Icon, null), tr.events),
              h('div', { className: 'dsb-bg-list' },
                background.slice().sort((a, b) => (a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1) || (b.time || 0) - (a.time || 0)).slice(0, 12).map(event => {
                  const state = event.status === 'running' ? tr.runningTool : event.status === 'killed' ? tr.killed : event.status === 'failed' ? tr.failed : tr.done
                  const tone = event.status === 'running' ? 'dsb-run' : event.status === 'killed' ? '' : event.status === 'failed' ? 'dsb-err' : 'dsb-ok'
                  const expanded = expandedBg === event.id
                  const started = typeof event.time === 'number' ? event.time : null
                  const end = typeof event.endedAt === 'number' ? event.endedAt : (typeof event.progressAt === 'number' ? event.progressAt : Date.now())
                  const seconds = started === null ? 0 : Math.max(0, Math.round((end - started) / 1000))
                  const output = typeof event.output === 'string' ? event.output : ''
                  return h('div', { className: 'dsb-bg-item', key: event.id },
                    h('div', { className: 'dsb-bg-head' },
                      h('span', { className: 'dsb-bg-label', title: event.label || event.tool }, event.label || event.tool),
                      event.auto === true ? h('span', { className: 'dsb-chip' }, tr.autoTag) : null,
                      h('span', { className: 'dsb-chip ' + tone }, state),
                      h('span', { className: 'dsb-bg-meta' }, seconds + 's'),
                      event.status === 'running'
                        ? h('button', { className: 'dsb-btn', type: 'button', onClick: () => void killEvent(event.eventId) }, tr.kill)
                        : h('button', { className: 'dsb-btn', type: 'button', onClick: () => setExpandedBg(expanded ? null : event.id) }, expanded ? tr.bgCollapse : tr.bgExpand),
                    ),
                    event.summary ? h('div', { className: 'dsb-bg-summary' }, event.summary) : null,
                    expanded
                      ? h('pre', { className: 'dsb-bg-pre' }, output.length > 0 ? output : (event.error ? 'Error: ' + event.error : tr.bgNoOutput))
                      : null,
                  )
                }),
              ),
            )
            : null,
          h('div', { className: 'dsb-card' },
            h('div', { className: 'dsb-card-title' }, h(Icon, null), tr.toolUsage),
            digest.usage.length === 0
              ? h('div', { className: 'dsb-card-body dsb-dir-sub' }, tr.noTools)
              : h('div', { className: 'dsb-usage' },
                digest.usage.map(item => h('div', { className: 'dsb-usage-row', key: item.name },
                  h('span', { className: 'dsb-usage-name', title: item.name }, item.name),
                  h('span', { className: 'dsb-bar' }, h('i', { style: { width: `${Math.max(6, Math.round((item.count / digest.maxCount) * 100))}%` } })),
                  h('span', { className: 'dsb-usage-meta' },
                    `× ${item.count}`,
                    item.ms > 0 ? ` · ${formatDuration(item.ms)}` : '',
                    item.failed > 0 ? h('span', { className: 'dsb-err' }, ` · ${tr.failed} ${item.failed}`) : null,
                    item.running > 0 ? h('span', { className: 'dsb-scroll-hint' }, ` · ${tr.runningTool}`) : null,
                  ),
                )),
              ),
          ),
          h('div', { className: 'dsb-card' },
            h('div', { className: 'dsb-card-title' }, h(Icon, null), tr.timeline),
            digest.steps.length === 0
              ? h('div', { className: 'dsb-card-body dsb-dir-sub' }, tr.noTimeline)
              : h('div', null,
                digest.steps.slice(-14).map(group => {
                  let groupThinking = ''
                  for (const item of group.events) {
                    if (item.kind === 'decision' && typeof item.thinking === 'string') { groupThinking = item.thinking; break }
                    if (item.describe !== undefined && typeof item.describe.thinking === 'string') { groupThinking = item.describe.thinking; break }
                  }
                  return h('div', { className: 'dsb-step', key: group.key },
                  h('div', { className: 'dsb-step-title' }, `${tr.stepLabel} ${group.turn}.${group.step}${groupThinking ? ' · ' + truncateText(groupThinking, 46) : ''}`),
                  group.events.map((event, index) => {
                    const view = eventView(event, tr)
                    return view === null ? null : h(EventRow, { key: `${group.key}:${index}`, view })
                  }),
                  )
                }),
              ),
          ),
        ),
        h('div', { className: 'dsb-tab-foot' },
          h('div', { className: 'dsb-quick' },
            tr.quickPhrases.map(phrase => h('button', {
              key: phrase,
              type: 'button',
              className: 'dsb-filter-chip',
              disabled: busy,
              onClick: () => setDraft(phrase),
            }, phrase)),
          ),
          h('div', { className: 'dsb-nudge' },
            h('select', {
              className: 'dsb-select',
              value: nudgeMode,
              disabled: busy,
              onChange: event => setNudgeMode(event.target.value),
            }, h('option', { value: 'auto' }, tr.modeAuto), h('option', { value: 'followup' }, tr.modeQueue)),
            h('input', {
              className: 'dsb-input',
              value: draft,
              placeholder: tr.nudgePlaceholder,
              disabled: busy,
              onChange: event => setDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) void nudge()
              },
            }),
            h('button', { className: 'dsb-btn', type: 'button', disabled: busy || draft.trim().length === 0, onClick: () => void nudge() }, tr.nudgeSend),
            h('button', { className: 'dsb-btn', type: 'button', onClick: () => void copy() }, tr.copy),
          ),
          note !== null ? h('div', { className: `dsb-note ${note.tone}` }, note.text) : null,
        ),
      )
    }

    /* --------------------------------------------------------------- setup -- */

    /* ---------------------------------------------------------- act card -- */

    /** Card for the mandatory `act` wrapper: renders the describe field and the wrapped tool. */
    function ActCard(props) {
      const tr = t()
      const block = props.block
      const meta = block !== null && typeof block === 'object' && 'meta' in block ? block.meta : undefined
      const describe = meta !== null && typeof meta === 'object' && typeof meta.describe === 'string' ? meta.describe : ''
      const tool = meta !== null && typeof meta === 'object' && typeof meta.tool === 'string' ? meta.tool : ''
      const ok = meta !== null && typeof meta === 'object' && typeof meta.ok === 'boolean' ? meta.ok : undefined
      const settled = describe.length > 0
      return h('div', { className: 'dsb-act', 'data-dsh-better-tooluse': 'act' },
        h('div', { className: 'dsb-act-head' },
          h('span', { className: 'dsb-act-tool' }, settled ? tool : 'act'),
          settled && ok !== undefined
            ? h('span', { className: 'dsb-chip ' + (ok ? 'dsb-ok' : 'dsb-err') }, ok ? tr.done : tr.failed)
            : null,
        ),
        settled
          ? h('div', { className: 'dsb-act-desc' }, describe)
          : h('div', { className: 'dsb-act-desc dsb-act-pending' }, tr.actPending),
      )
    }

    const TAB_DESCRIPTOR = {
      id: TAB_ID,
      title: () => t().tabTitle,
      description: () => t().tabDesc,
      icon: size => h(Icon, { size: size || 16 }),
      order: 60,
      single: true,
      component: props => h(DigestTab, props),
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        void loadClientConfig()
        ctx.effect(() => {
          const existing = document.getElementById(STYLE_ID)
          if (existing !== null && existing.parentNode !== null) existing.parentNode.removeChild(existing)
          const style = document.createElement('style')
          style.id = STYLE_ID
          style.textContent = CSS
          document.head.appendChild(style)
          return () => {
            if (style.parentNode !== null) style.parentNode.removeChild(style)
          }
        }, 'dsh-better-tooluse: styles')

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'better-tooluse',
          order: 2,
          label: () => t().title,
        }, props => h(DockStrip, { ...props, host: ctx })))

        /** Tool card for the mandatory act wrapper: renders describe + wrapped tool. */
        ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
          name: 'tool.call.toolview',
          key: 'act',
        }, props => h(ActCard, props)))

        /** better-sidebar is optional: register the 梳理 tab only when its client service arrives. */
        ctx.inject(['betterSidebar'], (scope) => {
          const service = scope.get('betterSidebar')
          if (service === undefined || typeof service.registerTab !== 'function') return
          scope.effect(() => {
            const dispose = service.registerTab(TAB_DESCRIPTOR)
            let tabs = null
            try {
              tabs = typeof service.getTabs === 'function' ? service.getTabs().map(item => item.id) : null
            } catch {
              tabs = null
            }
            report({ type: 'tab-registered', v: 4, tabId: TAB_ID, serviceVersion: service.version ?? null, tabs })
            return dispose
          }, 'dsh-better-tooluse: sidebar tab')
        })
      },
    }
  },
})
