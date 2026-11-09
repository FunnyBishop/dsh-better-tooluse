/** @file dsh-better-tooluse: the model-facing decision-stream protocol.
 *
 * The resident system-prompt section stays deliberately slim: the detailed
 * field/rendering rules live in the packaged `better-tooluse` skill, which the
 * model loads only when it needs them. Keeping this text static protects the
 * provider prompt cache.
 */

const NORMAL = `## 决策流协议（Decision stream protocol）

1. 可见正文里按行播报：\`◎ 目标：…\`（开复杂任务时）、\`▸ 决策：<思考结果> → <本步作用>\`（每次工具批之前）、\`↳ 发现：<关键结果> → <继续/调整>\`（批结果之后）、\`⟲ 调整：<接受内容> → <改变做法>\`（收到纠偏时）。
2. **所有普通工具调用必须用 \`act\` 包装**：\`act({ describe: "<思考结果> → <本步作用>", tool: "<工具名>", input: {…} })\`；describe 必填，缺失会被 Host 拒绝。交互/控制类工具（ask_user_question、present、render_ui、event、团队/子代理、目标、日程、作业、终端、plugin_manager、cordis_* 等）可直接调用。
3. 每批工具结果后可在正文额外输出一张精简的阶段梳理卡（\`dsh-ui\` 围栏，≤3 个组件）；没有 UI 围栏约定时跳过。
4. 预计超过约 60 秒的操作交给 \`event\` 工具事件化：后台运行，完成后结果自动回到上下文并触发新一轮。
5. 播报行是纯文本工作日志，不要用 UI 卡片/表格/代码块包装；每行尽量 ≤60 字；简单单步可省略。

详细字段、阶段梳理卡与事件化规则需要时加载 \`better-tooluse\` skill。`

const QUIET = `## 决策流协议（精简）

- 每批工具前一行 \`▸ 决策：<思考结果> → <本步作用>\`，结果后一行 \`↳ 发现：…\`；目标/调整按需。
- 普通工具调用必须用 \`act({ describe, tool, input })\` 包装（describe 必填）；交互/控制类工具可直接调用。
- 播报行是纯文本工作日志，不用 UI 卡片/表格/代码块包装；简单单步可省略。`

/**
 * Build the resident protocol section for one configuration.
 * @param {{ tone?: 'normal'|'quiet', eventEnabled?: boolean }} [options]
 * @returns {string}
 */
export function buildProtocolText(options = {}) {
  const tone = options.tone === 'quiet' ? 'quiet' : 'normal'
  let text = tone === 'quiet' ? QUIET : NORMAL
  if (tone !== 'quiet' && options.eventEnabled === false) {
    text = text.replace(/\n4\. [^\n]*/, '\n4. （事件化已关闭）')
  }
  return text
}

export const PROTOCOL_NORMAL = NORMAL
export const PROTOCOL_QUIET = QUIET
