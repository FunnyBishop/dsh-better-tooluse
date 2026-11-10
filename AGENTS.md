# dsh-better-tooluse — Agent 约定

## 版本号策略

- **小改动只加 patch 位**：bugfix、文档、小特性、UI 调整 → `x.y.Z` 中 Z +1（例如 `0.6.0` → `0.6.1`）。
- **minor / major 位只在用户明确指示时提升**：不要自行从 `0.6.x` 跳到 `0.7.0` 或 `1.0.0`。
- 用户说“加小版本号”时按 patch 处理；“加大版本号”才提升主版本。
- 纯文档/仓库配置改动可以不升版本，但一旦要发布（GitHub Release / npm）必须同步升 patch 位并在 CHANGELOG 记录。

## 其他约定

- 改动后：`node --check` 通过、`tests/core.test.mjs` 全绿、插件重载验证。
- 提交信息用英文短句；CHANGELOG 条目写清行为变化。
- `promo-video/` 与本地产物在 `.gitignore` 中，不要提交大文件。
