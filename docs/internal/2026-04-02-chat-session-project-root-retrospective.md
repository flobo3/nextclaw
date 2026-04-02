# Chat Session Project Root Retrospective

## 1. 这次真正暴露的问题

这次问题表面上看是两个 bug：

- 清除 `project_root` 提示成功，但刷新后还在
- 设置项目目录后，runtime 又把 `NextClaw workspace` 当成当前项目

但更深一层的问题不是“少写了一个 if”，而是我们一度在沿着错误方向演化：

- 用补丁思维修行为，而不是先澄清单一真相源
- 发现缺信息，就继续往现有热点和现有流程里塞逻辑
- 想恢复项目语义时，差点把 host workspace 语义覆盖掉

结果就是可能性越来越多，语义越来越绕，系统越来越难判断“当前到底哪一个才是真实上下文”。

## 2. 根因，而不是表象

### 2.1 显式 patch 却沿用了 merge 语义

`PUT /api/ncp/sessions/:id` 的语义应该是“我明确给你新的 session patch”。

但真实链路里一度还是走了“保留旧 metadata 再 merge”的 `saveSession` 语义，导致：

- `projectRoot: null` 看起来提交成功
- 旧的 `project_root` 又被合并回来

这不是“清除逻辑漏了一行”，而是写语义和存储语义没有对齐。

### 2.2 把两个真实上下文混成了一个

这里本来就有两个同时真实存在的目录语义：

- `Current project directory`：当前用户正在工作的 repo / directory
- `NextClaw host workspace directory`：NextClaw 自己的 memory、workspace-local skills、bootstrap 所在目录

如果为了强调 project，就把 host workspace 删掉，等于把另一半真实上下文也删了；如果只保留 host workspace，又会让 runtime 误判“当前项目”。

这类问题不能靠文案兜底，必须靠上下文模型本身说清楚。

### 2.3 新能力不该继续往热点中心文件里堆

这次还有一个过程问题：一旦需求跨 session / runtime / prompt，多处逻辑很容易自然滑向 `core agent loop` 之类的大中心文件。

这条路看起来快，长期最贵。

因为每多塞一层：

- 职责边界更模糊
- 调试成本更高
- 以后每个 runtime 差异都更容易继续堆在同一个中心点上

## 3. 这次最终收敛成了什么

这次最终采用的是一条更小、更硬的收敛路径：

### 3.1 一个真相源

不引入独立 `Project` 实体，继续坚持：

- `session` 是主语
- `session.metadata.project_root` 是会话项目目录的唯一真相源

### 3.2 一个明确写语义

显式 session patch 统一走 replace，而不是 merge：

- runtime 持久化仍可走 `saveSession`
- 显式 `updateSession` 必须走 `replaceSession`

这样“删除字段”才是真的删除字段。

### 3.3 两个真实上下文同时保留

runtime prompt 改成显式暴露：

- `Current project directory`
- `NextClaw host workspace directory`

两者都保留，不互相伪装，不互相降级。

### 3.4 让 host skills 成为补充层，而不是被切走

项目目录切换后，host workspace 的 bootstrap / workspace-local skills 仍然有效；
实现方式不是再加一套重系统，而是一个很小的 `LayeredSkillsLoader`：

- 主层：project workspace
- 补充层：host workspace

project 优先，host 补充，语义简单。

### 3.5 通用能力放在通用边界

目录选择器没有做成“这个会话特供弹窗”，而是做成服务端驱动的通用路径浏览能力，避免以后别的地方还得再造一遍。

## 4. 这次差点走错的地方

下面这些模式以后都应该直接警惕：

### 4.1 先补丁，后建模

一看到现象就开始补 if / 补同步 / 补兼容键清理，最后常常会把“为什么这里本来就有两套语义”和“谁才是真相源”给跳过去。

顺序应该反过来：

1. 先把语义模型说清楚
2. 再看当前代码哪里违背了这个模型
3. 最后做最小修复

### 4.2 为了保住旧行为，把正确语义也一起抹平

这次典型风险就是：为了让 project 生效，直接把 host workspace 的信息拿掉。

这不叫简化，这叫丢语义。

真正的简化不是把真实世界删没，而是减少“同一个事实的多种解释”。

### 4.3 明明是边界问题，却继续改中心编排层

如果问题本质发生在：

- session patch 语义
- runtime prompt 组装
- skills 解析

那就应该在这些边界上修，不应该顺手往 `loop.ts` 继续塞逻辑。

## 5. 以后处理同类需求的硬规则

### 5.1 先删，再简化，再新增

每次碰到这类需求，先问四个问题：

1. 现有语义里哪个是重复的，可以删掉？
2. 哪个 merge / fallback / 兼容路径其实可以直接取消？
3. 能不能把多个概念收敛成一个真相源？
4. 在前面都做完后，还剩下什么必须新增？

### 5.2 显式写接口不能偷偷保留旧值

只要接口语义是“显式更新/覆盖”，就不能暗中 merge 回已删除字段。

否则 UI 成功提示、接口成功返回、真实状态没变，用户一定会被背刺。

### 5.3 上下文模型要承认现实，而不是伪装现实

如果系统里就是有两个同时有效的上下文，就明确让它们同时存在。

不要为了省事把 A 说成 B，也不要为了强调 B 就把 A 静默隐藏。

### 5.4 新需求优先落在边界层，不落在热点中心层

优先级顺序应该是：

- session metadata / adapter
- runtime context builder
- runtime plugin boundary
- UI adapter / selector primitive

最后才考虑大中心编排文件。

## 6. 一句结论

这次最重要的不是“把项目目录功能补上了”，而是重新确认了一条演化原则：

**真正的长期优化，不是不断给系统加可能性，而是持续减少歧义、减少重复语义、减少补丁路径，让系统更少、更清楚、更像一个整体。**
