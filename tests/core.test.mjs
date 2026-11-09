import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  splitDescribe,
  protocolLines,
  reasoningDigest,
  summarizeArgs,
} from '../index.js'
import { describeGuardDecision, DEFAULT_EXEMPT } from '../lib/guard.js'
import { normalizeConfig, CONFIG_DEFAULTS } from '../lib/config.js'
import { buildProtocolText } from '../lib/protocol.js'
import { repairJsonText, normalizeActArguments } from '../lib/repair.js'

test('splitDescribe splits on the last arrow', () => {
  assert.deepEqual(splitDescribe('判断：先看日志 → 用 grep 查错误'), {
    thinking: '判断：先看日志',
    purpose: '用 grep 查错误',
  })
  assert.deepEqual(splitDescribe('没有箭头的一句话'), { thinking: '没有箭头的一句话', purpose: '' })
  assert.deepEqual(splitDescribe('判断 -> 旧式箭头'), { thinking: '判断', purpose: '旧式箭头' })
})

test('protocolLines keeps markers and structures decision lines', () => {
  const content = [
    { type: 'reasoning', text: 'hidden' },
    { type: 'text', text: '先说明一下\n▸ 决策：检查依赖 → 跑测试\n↳ 发现：全绿 → 提交\n**⟲ 调整：用户要降级 → 改用旧方案**' },
  ]
  const lines = protocolLines(content)
  assert.equal(lines.length, 3)
  assert.deepEqual(
    lines.map(line => [line.kind, line.label]),
    [['decision', '决策'], ['finding', '发现'], ['adjust', '调整']],
  )
  assert.equal(lines[0].thinking, '检查依赖')
  assert.equal(lines[0].purpose, '跑测试')
  assert.equal(lines[1].thinking, undefined)
})

test('protocolLines ignores non-protocol text', () => {
  assert.equal(protocolLines([{ type: 'text', text: '普通段落\n- 列表项' }]).length, 0)
})

test('reasoningDigest returns the last meaningful reasoning line', () => {
  const digest = reasoningDigest([
    { type: 'reasoning', text: '短。\n这一行足够长可以作为思考结果被面板采用，因为超过了二十四个字符。' },
  ])
  assert.ok(digest.includes('这一行足够长'))
  assert.equal(reasoningDigest([]), null)
})

test('summarizeArgs prefers command and falls back to raw text', () => {
  const argsSummary = summarizeArgs(JSON.stringify({ path: 'a.txt', command: 'npm test', other: 1 }))
  assert.ok(argsSummary.startsWith('npm test'))
  assert.ok(argsSummary.includes('a.txt'))
  assert.equal(summarizeArgs('not-json'), 'not-json')
})

test('describeGuardDecision refuses ordinary direct calls in hard mode', () => {
  const refusal = describeGuardDecision({ toolName: 'ops_bash', callId: 'call_1', exempt: DEFAULT_EXEMPT, mode: 'hard' })
  assert.ok(refusal.includes('describe 是强制字段'))
  assert.equal(describeGuardDecision({ toolName: 'ops_bash', callId: 'call_1', exempt: DEFAULT_EXEMPT, mode: 'off' }), undefined)
  assert.equal(describeGuardDecision({ toolName: 'ops_bash', callId: 'call_1', exempt: DEFAULT_EXEMPT, mode: 'soft' }), undefined)
})

test('describeGuardDecision allows exempt, nested, cordis and subagent dispatches', () => {
  const base = { exempt: DEFAULT_EXEMPT, mode: 'hard' }
  assert.equal(describeGuardDecision({ ...base, toolName: 'act' }), undefined)
  assert.equal(describeGuardDecision({ ...base, toolName: 'ask_user_question' }), undefined)
  assert.equal(describeGuardDecision({ ...base, toolName: 'cordis_inspect_query' }), undefined)
  assert.equal(describeGuardDecision({ ...base, toolName: 'ops_bash', callId: 'act-inner-1' }), undefined)
  assert.equal(describeGuardDecision({ ...base, toolName: 'ops_bash', callId: 'x', rootCallId: 'event-1' }), undefined)
  assert.equal(describeGuardDecision({ ...base, toolName: 'ops_bash', callId: 'x', subagent: true }), undefined)
  assert.equal(describeGuardDecision({ ...base, toolName: 'ops_bash', exempt: [...DEFAULT_EXEMPT, 'ops_bash'] }), undefined)
})

test('normalizeConfig applies defaults and clamps', () => {
  const defaults = normalizeConfig(undefined)
  assert.equal(defaults.enforceDescribe, 'hard')
  assert.equal(defaults.protocolTone, 'normal')
  assert.equal(defaults.eventEnabled, true)
  assert.equal(defaults.autoEventizeMs, 60000)
  assert.equal(defaults.eventProgressMs, 5000)
  assert.ok(Array.isArray(defaults.exemptTools))
  const custom = normalizeConfig({
    enforceDescribe: 'nope',
    exemptTools: [' x ', 'x', '', 'y'],
    protocolTone: 'quiet',
    actCardLimit: 999,
    backfillEvents: -5,
    showDockStrip: false,
  })
  assert.equal(custom.enforceDescribe, CONFIG_DEFAULTS.enforceDescribe)
  assert.deepEqual(custom.exemptTools, ['x', 'y'])
  assert.equal(custom.protocolTone, 'quiet')
  assert.equal(custom.actCardLimit, 30)
  assert.equal(custom.backfillEvents, 0)
  assert.equal(custom.showDockStrip, false)
  assert.equal(normalizeConfig({ autoEventizeMs: -1 }).autoEventizeMs, 0)
  assert.equal(normalizeConfig({ eventProgressMs: 999999 }).eventProgressMs, 60000)
})

test('buildProtocolText keeps core rules in both tones', () => {
  const normal = buildProtocolText({ tone: 'normal', eventEnabled: true })
  const quiet = buildProtocolText({ tone: 'quiet', eventEnabled: true })
  for (const text of [normal, quiet]) {
    assert.ok(text.includes('act'))
    assert.ok(text.includes('▸'))
    assert.ok(text.length < 1800)
  }
  assert.ok(normal.includes('阶段梳理卡'))
  assert.ok(!quiet.includes('阶段梳理卡'))
  assert.ok(normal.length > quiet.length)
  const noEvent = buildProtocolText({ tone: 'normal', eventEnabled: false })
  assert.ok(noEvent.includes('事件化已关闭'))
})

test('repairJsonText closes a truncated string and object', () => {
  const result = repairJsonText('{"describe":"验证一下')
  assert.equal(result.repaired, true)
  assert.equal(result.value.describe, '验证一下')
})

test('repairJsonText completes nested structures', () => {
  const result = repairJsonText('{"describe":"x","tool":"ops_bash","input":{"command":"echo hi"')
  assert.equal(result.repaired, true)
  assert.equal(result.value.input.command, 'echo hi')
})

test('repairJsonText drops trailing commas and escapes raw newlines', () => {
  const result = repairJsonText('{"a":1,\n"b":"line1\nline2",}')
  assert.equal(result.repaired, true)
  assert.equal(result.value.a, 1)
  assert.equal(result.value.b, 'line1\nline2')
})

test('repairJsonText reports unrepairable garbage', () => {
  assert.equal(repairJsonText('not json at all').value, undefined)
  assert.equal(repairJsonText(undefined).repaired, false)
})

test('normalizeActArguments passes objects and repairs strings', () => {
  const direct = { describe: 'a → b', tool: 'ops_bash', input: {} }
  assert.deepEqual(normalizeActArguments(direct), { value: direct, repaired: false })
  const repaired = normalizeActArguments('{"describe":"a → b","tool":"ops_bash","input":{')
  assert.equal(repaired.repaired, true)
  assert.equal(repaired.value.tool, 'ops_bash')
  assert.equal(normalizeActArguments('}{').value, null)
})
