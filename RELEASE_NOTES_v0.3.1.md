# dsh-better-tooluse v0.3.1

> Decision-stream visibility for DeepSeek Harness —— 让每次思考与工具调用可见、可纠偏。

首个公开发布版本。插件把 Agent 的判断写成纯文字工作日志，强制每次普通工具调用携带 `describe`，并在右侧「梳理」面板里实时展示 act 卡片。

## ✨ 亮点

- **四类播报行**（可见正文，纯文本）：`◎ 目标` / `▸ 决策：<思考结果> → <本步作用>` / `↳ 发现` / `⟲ 调整`。
- **强制 `act` 包装**：`act({ describe, tool, input })`，直连普通工具会被护栏拒绝；`describe` 缺失即失败。
- **act 卡片**：输入框梳理条 + 右侧「梳理」页 + 工具卡，实时显示工具名 / 思考结果 / 作用 / 状态 / 耗时 / 结果；支持展开全文、状态与工具筛选、运行中置顶。
- **后台事件 `event`**：长任务后台运行，完成后结果自动回上下文并触发新一轮；支持 `list` / `kill`。
- **阶段梳理卡**：可选配合 dsh-genui，在关键节点输出精简 `dsh-ui` 卡片。
- **配置化**：`enforceDescribe`（hard/soft/off）、`exemptTools`、`protocolTone`（normal/quiet）、`eventEnabled`、`backfillEvents`、`maxResultChars`、面板显隐等 9 个键。
- **按需 skill**：完整协议细节打包为 `better-tooluse` skill，常驻提示只保留 5 条核心规则。

## 📦 安装

```text
plugin_manager action=install_bundle target=link:<path-to-this-checkout>
```

或 CLI：

```bash
dsh plugin --profile <profile> install <path-to-this-checkout>
```

要求 DSH `>=0.2.2-rc.1 <0.3.0`；可选依赖 `dsh-better-sidebar`（梳理页）、`@changfenhuang/dsh-genui`（阶段卡）、`dsh-ops`（已适配 `ops_*` 工具名替换）。

## 🔧 本次改动

### Fixed
- skill provider 条目补齐 `rank` / `resourceBase` / Windows 正确路径，修复 DSH `invalid rank` 校验失败。
- `act` 内层 dispatch 转发 `exec.toolSet`（步骤准入），与直连共享工具集门禁（例如被 dsh-ops 替换的 `read` 即使经 act 包装也会被拒绝）。

### Added
- 梳理面板工具筛选（与状态筛选叠加）。
- `GET /plugins/dsh-better-tooluse/config` 与 `showDockStrip` / `showActCards` / `actCardLimit` 客户端偏好。

## ✅ 验证

- `node --test tests/core.test.mjs`：9/9 通过（describe 解析 / 护栏判定 / 配置归一化 / 协议两档）。
- 运行态：`/health` 与 `/config` 正常；客户端回传 `tab-registered` 与 dock/tab 双 mount；`act` 工具与护栏生效。

## ⚠️ 已知限制

- DSH 原生工具行仍归入可折叠的「已调用工具」区；act 卡片由插件自行渲染，不改变内核分组。
- 被 act 包装后不再显示各工具原生富卡片（diff/搜索/终端），统一为 describe 优先的 act 卡。
- 后台事件表仅存在内存，插件重载/DSH 重启后不保留历史。
- 面板暂不提供「跳转到对话内对应工具卡」。
- 内建豁免表覆盖常见控制类工具；新插件的控制工具可能需要加入 `exemptTools`。
- 仅在 Windows + desktop profile 实测。

## 📄 License

[MIT](https://github.com/FunnyBishop/dsh-better-tooluse/blob/main/LICENSE) © 2026 FunnyBishop
