## 目录结构
- 命令入口层只保留面向 CLI runtime 的顶层 command 文件。
- 具体实现按职责拆到 `agent/`、`channel/`、`compat/`、`config/`、`diagnostics/`、`plugin/`、`remote/`、`service/`、`usage/` 与 `ncp/` 子树，避免入口层继续扁平膨胀。
