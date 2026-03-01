# 2026-03-01 Remove Config Provider Link

## 背景 / 问题

- 用户要求移除 README 中文文档列表中的“配置与 Provider”外链。

## 决策

- 仅删除指定链接条目，保留其余文档入口不变。

## 变更内容（迭代完成说明）

- 文件：`README.zh-CN.md`
- 变更：删除 `- [配置与 Provider](https://docs.nextclaw.io/zh/guide/configuration)`。

## 测试 / 验证 / 验收方式

```bash
sed -n '68,88p' README.zh-CN.md
rg -n "\[配置与 Provider\]\(https://docs.nextclaw.io/zh/guide/configuration\)" README.zh-CN.md
```

验收点：

- 文档列表中不再出现该链接。
- 其余链接保持原样。

## 用户 / 产品视角验收步骤

1. 打开 `README.zh-CN.md` 的“文档”章节。
2. 确认“配置与 Provider”链接已不存在。
3. 确认“模型选择 / 命令参考 / 愿景与路线图 / 飞书接入教程”仍可见。

## 发布 / 部署方式

- 文档变更，无需单独发布流程；随常规代码发布即可。

## 影响范围 / 风险

- Breaking change：否。
- 风险：低，仅文档入口删减。
