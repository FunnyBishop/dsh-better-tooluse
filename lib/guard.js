/** @file dsh-better-tooluse: mandatory-describe guard policy.
 *
 * Pure decision function so the rule can be unit-tested without a Host.
 */

/** Tools that keep their native UI/behavior and may be called without act. */
export const DEFAULT_EXEMPT = Object.freeze([
  'act', 'event', 'plugin_manager', 'skill', 'todo_write', 'workflow',
  'ask_user_question', 'present', 'render_ui', 'validate_dsh_ui',
  'subagent', 'spawn_teammate', 'send_message', 'interrupt_agent', 'list_agents', 'list_subagent_models', 'wait_agent',
  'team_task_create', 'team_task_get', 'team_task_list', 'team_task_update',
  'create_goal', 'update_goal', 'get_goal',
  'schedule_create', 'schedule_edit', 'schedule_delete', 'schedule_list', 'schedule_view',
  'job_list', 'job_output', 'job_kill',
  'terminal_open', 'terminal_list', 'terminal_read', 'terminal_send', 'terminal_signal', 'terminal_close',
])

/** Generated call ids mark dispatches our own wrappers started; the guard lets them through. */
export const NESTED_CALL_PREFIXES = Object.freeze(['act-inner-', 'event-'])

/**
 * Decide whether one tool dispatch must be refused because it bypasses act.
 *
 * @param {object} input
 * @param {string} input.toolName dispatched tool name.
 * @param {string} [input.callId] the execution's call id.
 * @param {string} [input.rootCallId] the root call id.
 * @param {Iterable<string>} [input.exempt] extra exempt tool names.
 * @param {boolean} [input.subagent] whether the owning session is a subagent session.
 * @param {'hard'|'soft'|'off'} [input.mode] enforcement mode.
 * @returns {string | undefined} refusal text, or undefined to allow.
 */
export function describeGuardDecision(input) {
  const mode = input.mode ?? 'hard'
  if (mode === 'off') return undefined
  const toolName = String(input.toolName ?? '')
  if (toolName.length === 0) return undefined
  const exempt = input.exempt instanceof Set ? input.exempt : new Set(input.exempt ?? [])
  if (toolName === 'act' || exempt.has(toolName) || toolName.startsWith('cordis_')) return undefined
  const callId = String(input.callId ?? '')
  const rootCallId = String(input.rootCallId ?? '')
  if (NESTED_CALL_PREFIXES.some(prefix => callId.startsWith(prefix) || rootCallId.startsWith(prefix))) return undefined
  if (input.subagent === true) return undefined
  if (mode === 'soft') return undefined
  return 'describe 是强制字段：请改用 act({describe:"<思考结果 → 本步工具作用>", tool:"' + toolName + '", input:{...}}) 包装这次工具调用。'
}
