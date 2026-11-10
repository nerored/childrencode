# ChildrenCode 架构说明

本文面向维护关卡、扩展引擎或部署项目的开发者，说明 ChildrenCode 的代码分层、领域模型、运行语义和边界。文中描述以 `src/` 下的实现为准；如果文档与代码冲突，以代码和测试为准。

## 1. 架构总览

ChildrenCode 是一个静态单页应用，技术栈为 Vite、React 和 TypeScript。所有关卡数据在构建时打包进前端产物，没有服务端、数据库、账号系统或网络请求。浏览器只负责渲染界面、执行模拟和把星数写入 localStorage。

```text
components/  --->  App.tsx  --->  state/progress.ts
     |                |                  |
     v                v                  v
 engine/*  ------> domain/* <------ content/*
```

分层职责：

- `domain` 只放类型和纯辅助函数，不依赖其他层。
- `engine` 依赖 `domain`，提供解析、模拟、评分和校验，全部是纯函数。
- `content` 依赖 `domain`，用 TypeScript 数据描述场景、章节、检查点和关卡。
- `state` 依赖 `domain`，负责进度读写与解锁判断。
- `components` 依赖以上各层，负责界面和交互。
- `App.tsx` 持有当前视图、编程轨道和进度，是页面切换的唯一入口。

这种划分让规则可以脱离 React 单独测试。模拟器不读写浏览器状态，关卡校验也不需要渲染组件。

## 2. 目录与职责

| 路径 | 职责 |
| --- | --- |
| `src/App.tsx` | 视图状态、轨道状态、进度状态，以及关卡完成后的记录 |
| `src/domain/types.ts` | `WorldSpec`、`LevelSpec`、`Command`、`RunResult`、`Score` 等类型 |
| `src/domain/commands.ts` | 方向向量、转向、坐标键、指令计数和文本格式化 |
| `src/engine/parse.ts` | 把 Python 风格文本解析为 `Command[]` |
| `src/engine/simulate.ts` | 在关卡网格上执行程序，产出 `RunResult` |
| `src/engine/score.ts` | 计算代码长度和星级 |
| `src/engine/validate.ts` | 校验单关和场景包的结构与可解性 |
| `src/content/world.ts` | 汇总四个场景包，提供按顺序查询关卡的函数 |
| `src/content/scenes/*.ts` | 四座岛的章节、检查点和 64 个关卡 |
| `src/state/progress.ts` | 进度序列化、最佳星数、章节与场景门槛 |
| `src/components/*` | 首页、世界地图、章节地图、关卡编辑器和结算面板 |

测试文件与对应源码同目录，使用 `bun test` 运行。

## 3. 领域模型

### 3.1 内容层级

内容是一棵固定深度的树：

```text
WorldSpec
└── SceneSpec[]                 4 个场景
    └── ChapterSpec[]           每个场景 2 章
        └── CheckpointSpec[]    每章 4 个检查点
            └── levelIds        每个检查点 2 个关卡
```

`WorldSpec.levels` 是按 id 索引的关卡字典，`SceneSpec.chapters` 保存导航结构。`CheckpointSpec.levelIds` 引用字典中的关卡，不重复存关卡对象。`world.ts` 里的 `PACKS` 固定为风车原野、潮汐回廊、齿轮工坊、雾林岔路，`WORLD.scenes` 使用同一顺序。

`allLevels()` 按场景、章节、检查点、关卡 `index` 展开全部关卡，供测试和内容检查按顺序遍历。`findLevel()`、`findScene()`、`findChapter()` 和 `nextLevelIdInWorld()` 是基于同一份数据的小查询函数。

### 3.2 坐标与方向

网格使用屏幕坐标：原点在左上角，`x` 向东增长，`y` 向南增长。因此北是 `y - 1`，南是 `y + 1`。`DIRECTIONS` 给出四个方向的单位向量，`cellKey()` 统一把格子格式化为 `"x,y"`，所有集合查找都依赖这个键。

`Point` 不带方向。起点和运行结果使用 `Point & { direction: Direction }`，方向单独存放在 `Direction` 联合类型中。

### 3.3 关卡定义

`LevelSpec` 是单关的完整定义：

| 字段 | 含义 |
| --- | --- |
| `id` | 形如 `s01-c01-k01-l01` 的唯一标识 |
| `sceneId`、`chapterId`、`checkpointId` | 所属层级，校验时会核对 |
| `index` | 关卡在章节内的顺序 |
| `title`、`brief`、`hint` | 标题、任务说明、文字提示 |
| `grid` | 宽、高和障碍格 |
| `start` | 起点坐标与朝向 |
| `goal` | 目标类型、道具格和终点格 |
| `allowedCommands` | 图形化编辑器允许出现的指令种类 |
| `parCode`、`parSteps` | 三星阈值，必须与标准解一致 |
| `standardAnswer` | 可通关的标准解，也是参考解 |
| `tutorial` | 可选的分步引导文字和高亮位置 |

`Goal.kind` 有 `reach` 和 `collect` 两种取值，界面用它显示“抵达任务”或“收集任务”。当前模拟器不按这个字段分支，完成条件统一是到达 `target` 并收齐 `items`。

### 3.4 指令与条件

`Command` 是带判别字段的联合类型，图形化编辑器和文本解析器最终都产出同一棵指令树：

| `kind` | 字段 | 含义 |
| --- | --- | --- |
| `forward` | `steps` | 沿当前朝向前进若干格 |
| `turn` | `direction` | 左转或右转 90 度 |
| `repeat` | `times`、`body` | 重复执行一组指令 |
| `if` | `condition`、`then`、`else?` | 条件分支，`else` 可省略 |
| `setVar` | `name`、`value` | 把变量设为整数 |
| `changeVar` | `name`、`delta` | 在变量原值上增加整数 |

条件有三种：

| `Condition.kind` | 判定 |
| --- | --- |
| `pathAhead` | 前方一格在地图内且不是障碍 |
| `itemAhead` | 前方一格有尚未收集的目标道具 |
| `varAtLeast` | 指定变量的当前值大于或等于阈值，未赋值按 0 处理 |

### 3.5 运行结果与评分

`RunResult` 记录是否完成、已收集格子的键、总步数、动作轨迹、失败原因、最终位置与朝向、变量快照。`trace` 只包含前进和转向动作，每一步都记录执行后的位置与方向，舞台用它标出走过的格子。

`Score` 在一次运行结束后生成，记录关卡 id、是否完成、代码长度、步数、星数、收集结果和失败原因。进度层只消费其中的星数。

## 4. 引擎语义

`simulate()` 是纯函数，输入关卡和指令树，输出 `RunResult`。它不读取时间、随机数或浏览器环境，因此同一程序在同一关卡上的结果完全确定。

### 4.1 初始化与动作计数

运行开始时，小车位于 `level.start`，朝向 `level.start.direction`；变量表为空；已收集集合为空；步数为 0。

只有两种动作消耗步数：

- 前进进入一个新格子，消耗 1 步。
- 左转或右转 90 度，消耗 1 步。

条件判断、循环控制、变量赋值和变量累加都不计步。一次运行最多允许 1000 个动作，第 1001 个动作会被拒绝，运行以 `max-steps` 结束。

### 4.2 前进

`forward` 按 `steps` 逐格移动。每进入一格前依次检查：

1. 目标格是否在网格内。
2. 目标格是否是障碍。
3. 是否还有动作预算。

任一项失败就立即停止整个程序，小车留在最后一个合法格子，`failureReason` 分别为 `out-of-bounds`、`obstacle` 或 `max-steps`。进入新格子后，如果该格有目标道具，就把格子键加入已收集集合。

`steps` 小于 1 或不是有限数时按 0 处理，小数向下取整，因此负数前进不会后退。`forward` 的步数在图形化编辑器中限制为 1 到 9，文本轨道可以写更大的整数，但仍受 1000 动作上限约束。

### 4.3 转向

`turn` 只改变朝向，不移动。左转按北、东、南、西的顺序逆时针旋转一格，右转顺时针旋转一格。每次转向计 1 步，并写入轨迹。

### 4.4 重复

`repeat` 先取 `times` 的整数部分。小于 1 或非有限值按 0 处理，上限是 100。循环体使用同一份位置、方向、变量和已收集集合，每次迭代重新执行整段指令，条件也会重新求值。

嵌套重复分别受自身的 100 次上限限制，但所有前进和转向共享全局的 1000 动作预算。循环本身不额外计步。代码长度只把循环体算一次，不乘迭代次数。

### 4.5 条件分支

`if` 在每次执行时求值当前条件，只执行命中的分支。`then` 和 `else` 都可以包含任意指令，包括嵌套的 `repeat` 和 `if`。

`pathAhead` 只看前方是否越界或撞障碍，不关心前方有没有道具。`itemAhead` 只看前方格是否在 `goal.items` 中且尚未收集。`varAtLeast` 读取变量表，没有赋值的变量按 0 比较。条件求值不消耗步数。

### 4.6 变量

`setVar` 直接覆盖变量值，`changeVar` 在旧值上累加，旧值不存在时从 0 开始。两者都不消耗步数，也不改变小车位置。变量值可以是负数，文本解析器要求是安全整数，图形化编辑器的数值输入限制在 0 到 999。

变量只在单次运行内存在。每次点击运行都会从空变量表开始，不跨尝试保存。

### 4.7 完成判定与失败原因

程序顺利执行完后，模拟器还会检查两个条件：

- 小车是否停在 `goal.target`。
- 是否已经收集 `goal.items` 中的全部格子。

任一条件不满足就以 `incomplete` 结束。失败原因共有四种：

| 原因 | 触发时机 |
| --- | --- |
| `out-of-bounds` | 前进时走出网格 |
| `obstacle` | 前进时撞上障碍 |
| `max-steps` | 需要执行第 1001 个动作 |
| `incomplete` | 程序结束但未到达终点或漏收道具 |

失败运行仍会返回当前位置、轨迹、变量和已收集道具，界面据此展示最后一次运行的状态。

### 4.8 代码长度

代码长度由 `codeLength()` 计算：

```text
codeLength = 1 + 指令节点总数
```

开头的“当开始被点击”固定算 1。`countCommands()` 递归统计所有节点：循环体只计一次，`if` 的 `then` 和 `else` 都计入，与运行时的分支选择和循环次数无关。

例如：

```text
当开始被点击
前进 1 步
```

代码长度为 3。

```text
当开始被点击
重复 3 次
  前进 1 步
```

代码长度也是 3，因为循环体不按 3 次迭代放大。

每关的 `parCode` 必须等于标准解的代码长度，`parSteps` 必须等于标准解实际消耗的步数。关卡校验会强制这两个等式。

### 4.9 星级公式

```text
stars = 完成 ? 1 : 0
      + 完成且 codeLength <= parCode ? 1 : 0
      + 完成且 steps <= parSteps ? 1 : 0
```

失败运行固定 0 星。三星阈值来自标准解，所以标准解本身必然拿到 3 星，这一点由内容测试覆盖。关卡结算只保存星数，不保存代码和轨迹。

## 5. 文本 DSL

Python 轨道使用一个自定义的、面向关卡的 Python 子集，不是 CPython 解释器，也不支持函数、类、导入或任意表达式。解析器逐行读取，把语句转换成与图形化编辑器相同的 `Command[]`。

支持的语句：

| 语句 | 示例 |
| --- | --- |
| 前进 | `coder.forward(2)` |
| 左转 | `coder.turnLeft()` |
| 右转 | `coder.turnRight()` |
| 重复 | `repeat(3):` |
| 条件 | `if coder.pathAhead():` |
| 条件 | `if coder.itemAhead():` |
| 变量比较 | `if score >= 2:` |
| 否则 | `else:` |
| 赋值 | `score = 1` |
| 累加 | `score += 1` |

书写规则：

- 每行一条语句，空行会被忽略。
- `//` 之后的内容视为注释，可以单独成行，也可以写在语句末尾。
- 缩进必须是 2 个空格的整数倍，不接受制表符。
- `repeat`、`if` 和 `else` 必须有缩进一级的主体。
- `else:` 必须与同层的 `if` 配对。
- 整数可以是负数，但必须是 JavaScript 安全整数。
- 文本轨道中的变量名必须是 `[A-Za-z_][A-Za-z0-9_]*`。

示例：

```text
repeat(3):
  coder.forward(1)
if coder.pathAhead():
  coder.forward(1)
else:
  coder.turnRight()
```

解析失败时返回空程序和带行号的错误信息，关卡页显示错误并停止本次运行。点击运行后，解析成功的指令树会同步回图形化编辑器，因此两条轨道看到的是同一份程序。

`formatTextProgram()` 负责把指令树反向格式化为上面的文本，使用 2 空格缩进。“载入积木代码”按钮就是调用它把当前积木程序写进文本框。

图形化编辑器的变量名输入最多 12 个字符，没有限制只能用 ASCII。中文变量名可以正常参与图形化运行，但在 Python 轨道运行时会被解析器拒绝，需要改成合法标识符。

## 6. 内容编写规则

### 6.1 场景包结构

每个场景文件导出一个 `ScenePack`，包含一个 `SceneSpec` 和该场景的全部 `LevelSpec`。`world.ts` 把四个包合并为 `WorldSpec`。

`validateScene()` 检查：

- 场景恰好有 2 章。
- 每章恰好有 4 个检查点。
- 每个检查点恰好引用 2 个关卡。
- 关卡 id 不重复，且被某个检查点引用。
- 关卡的 `sceneId`、`chapterId`、`checkpointId` 与所在层级一致。
- 每个关卡再通过 `validateLevel()`。

### 6.2 单关校验

`validateLevel()` 检查：

- id 匹配 `^s\d{2}-c\d{2}-k\d{2}-l\d{2}$`。
- 网格宽高在 5 到 8 之间。
- 起点、终点、道具和障碍都在网格内。
- 起点不是障碍。
- `title`、`brief`、`hint` 非空。
- `standardAnswer` 非空且能通关。
- `parCode` 等于标准解的代码长度。
- `parSteps` 等于标准解的步数。
- 每个道具都能从起点经非障碍格到达。

关卡校验只在测试中运行，不会在应用启动时阻塞页面。内容测试还会检查标题长度为 4 到 8 个汉字、同一检查点的两关不同名，以及场景名和关卡名不复用腾讯场景名。

`allowedCommands` 决定图形化指令栏显示哪些积木，目前没有校验它是否覆盖标准解所需的全部指令。新增关卡时要自己确认标准解里的每种指令都出现在允许列表中。

### 6.3 新增关卡

1. 在对应 `src/content/scenes/*.ts` 中新增 `LevelSpec`，补齐层级 id、网格、起点、目标、允许指令、提示和标准解。
2. 计算标准解的代码长度与运行步数，写入 `parCode` 和 `parSteps`。
3. 把新关卡 id 加入对应 `CheckpointSpec.levelIds`。一个检查点固定 2 关，增加关卡需要同时新增检查点或调整章节结构。
4. 运行 `bun test`。内容测试会遍历全部关卡，重新校验结构和三星可解性。

## 7. 进度与解锁

### 7.1 存储格式

进度保存在 localStorage，键为 `childrencode.progress.v1`：

```ts
interface StoredProgress {
  version: 1;
  starsByLevel: Record<string, 0 | 1 | 2 | 3>;
  updatedAt: string;
}
```

`loadProgress()` 对缺失、损坏、版本不符或字段类型错误的数据回退为空进度。`saveProgress()` 吞掉写入异常，隐私模式或配额不足时游戏仍可继续，只是不保存。`recordResult()` 只保留每关历史最高星，星数不会因为重打变低。

`resetProgress()` 存在于状态模块和测试中，界面没有提供重置入口。

### 7.2 解锁门槛

所有解锁都由星数派生，不额外保存“已解锁”标记：

| 对象 | 条件 |
| --- | --- |
| 第一个场景 | 始终开放 |
| 后续场景 | 上一个场景至少 29/48 星 |
| 每章第一关 | 场景与章节已开放 |
| 章节内后续关卡 | 上一关至少 1 星 |
| 每座岛的第一章 | 场景已开放时，第一章始终开放 |
| 每座岛的第二章 | 上一章至少 15/24 星 |

第二章使用 `ChapterSpec.starGate`，当前所有章节都设为 15；代码在字段缺失时也回退到 15。场景门槛是固定常量 29，没有写在场景数据里。

`chapterStars()` 和 `sceneStars()` 会去重关卡 id，再累加最佳星数。章节满星 24，场景满星 48，全流程满星 192。

`nextLevelId()` 按场景、章节、检查点、关卡顺序寻找下一个已解锁关卡。它跳过仍未解锁的关卡，到场景末尾返回 `undefined`。关卡页的“下一关”按钮依赖这个结果。

## 8. UI 流程

### 8.1 视图状态

`App.tsx` 用一个联合类型表示当前屏幕：

```ts
type View =
  | { name: "home" }
  | { name: "world" }
  | { name: "chapter"; sceneId: string; chapterId: string }
  | { name: "level"; levelId: string };
```

页面不使用 URL 路由，切换屏幕只改 React 状态。刷新浏览器会回到首页。编程轨道保存在 `App` 的 `track` 状态中，取值是 `"blocks"` 或 `"python"`，不写入 localStorage。

### 8.2 页面顺序

1. 首页展示产品介绍、编程轨道选择、全流程星数和通关数。点击“开始闯关”进入世界地图。
2. 世界地图展示四张场景卡。锁定的场景不能点击；已解锁的场景显示本岛星数和完成数。打开场景时自动选择第一个已解锁章节。
3. 章节地图展示本章标签、四个检查点和每关的星数。锁定的章节和关卡显示锁标记，不能进入。
4. 关卡页左栏是网格舞台和运行状态，右栏是编辑器与提示面板。

页面采用天蓝/白云浅色主题，颜色变量集中在 `src/styles.css` 与 `src/components/level/level.css`。

### 8.3 关卡页状态

`LevelScreen` 持有：

- `program`：当前指令树。
- `pythonSource`：文本编辑器的原始输入，未编辑时为 `null`。
- `parseError`：文本解析错误。
- `result`、`score`：最近一次运行的结果和评分。
- `frames`、`frameIndex`、`playing`：播放帧、当前帧与播放状态。
- `resultOpen`：是否显示结算面板（播放结束后才为 true）。
- `attempts`：本次进入关卡后的运行次数。

点击运行时，图形化轨道直接使用 `program`；Python 轨道先调用 `parseTextProgram()`，失败则显示错误并中止。解析成功后，指令树写回 `program`，再交给 `simulate()` 和 `scoreRun()`，并由 `buildPlaybackFrames()` 生成播放帧。播放结束后才打开结算面板并调用 `onComplete()`，由 `App` 合并最高星并写入 localStorage。

结算面板展示星数、代码长度和步数的达标情况。参考解在通关后或失败两次后可见，内容来自 `level.standardAnswer` 的文本格式化结果。“下一关”只在已通关且存在下一个已解锁关卡时可用。

网格舞台是纯展示组件。它接收关卡和当前播放帧，渲染网格、道具、终点、轨迹与绝对定位的小车，不负责计时，也不参与规则判定。

### 8.4 拖拽与播放

积木拖拽由 `commandTree.ts` 的纯函数和 `BlockEditor` 的指针会话组成。每个容器用 `data-drop-container` 标识插入位置，每块积木用 `data-drag-handle` 提供拖拽手柄；`pointermove` 通过 `elementFromPoint` 命中空位，`pointerup` 提交 `moveCommand` 或 `insertCommand`。拖入自身子树会被拒绝；点击、上移、下移与删除按钮保留为键盘替代。

运行时 `LevelScreen` 先调用 `simulate()` 和 `scoreRun()`，再由 `playback.ts` 的 `buildPlaybackFrames()` 从 `trace` 生成 `StageFrame[]`。`GridStage` 只渲染当前帧，小车的绝对定位由 `--agent-x` / `--agent-y` 驱动 CSS transition；每 280ms 推进一帧，末帧后 240ms 打开结算面板，“跳过播放”直接到末帧。

## 9. 测试

当前有 11 个测试文件、159 个用例，全部通过 `bun test` 运行：

| 文件 | 覆盖内容 |
| --- | --- |
| `src/domain/commands.test.ts` | 方向向量、转向、坐标键、指令计数、文本格式化 |
| `src/engine/simulate.test.ts` | 移动、转向、收集、障碍、越界、重复上限、条件、变量、动作上限 |
| `src/engine/parse.test.ts` | 各类语句、嵌套、注释、缩进错误、行号错误、格式化往返 |
| `src/engine/score.test.ts` | 代码长度、三星组合、失败运行 |
| `src/engine/validate.test.ts` | 单关字段、标准解、par 一致性、可达性、场景结构 |
| `src/content/levels.test.ts` | 64 关全部可解且三星，标题规则，命名边界 |
| `src/content/world.test.ts` | 世界层级、唯一 id、查询顺序、完整性 |
| `src/state/progress.test.ts` | 存储容错、最佳星数、章节与场景上限、解锁 |
| `src/state/unlock.test.ts` | 15/24 与 29/48 门槛、顺序解锁、下一关、重置 |
| `src/components/level/commandTree.test.ts` | 拖拽路径解析、插入/删除/移动、嵌套与子树保护 |
| `src/components/level/playback.test.ts` | 起始帧、逐帧轨迹、收集进度、失败与空轨迹 |

测试使用内存中的存储替身代替浏览器 localStorage，因此不依赖运行环境，也没有固定等待或时间相关断言。项目目前没有浏览器端到端测试，界面交互不在自动化测试范围内。

常用命令：

```bash
bun test           # 运行测试
bun run typecheck  # TypeScript 类型检查
bun run verify     # typecheck、test、build 依次执行
```

## 10. 构建与部署

`vite.config.ts` 只启用 React 插件，并设置 `base: "./"`。构建产物是 `dist/` 下的静态文件，资源使用相对路径，因此既能部署在域名根目录，也能部署在 GitHub Pages 的项目子路径。

`.github/workflows/deploy.yml` 在推送到 `main` 或手动触发时执行：

1. 检出代码。
2. 安装 Bun。
3. `bun install --frozen-lockfile`。
4. `bun run build`。
5. 配置 Pages，上传 `dist/`。
6. 使用 `actions/deploy-pages` 发布。

首次使用时，需要在仓库的 Settings > Pages 中把发布来源设为 GitHub Actions。应用没有服务端路由，部署时不需要额外的重写规则。

## 11. 已知限制

- 舞台是 CSS 绘制的 2.5D 网格，不是 3D 场景，也没有 WebGL 渲染。
- 图形化编辑器是自建的结构化 React 组件，支持指针拖拽重排与嵌套，也保留点击和上下移动按钮；它不是 Blockly，不兼容 Scratch 或 Blockly 的积木格式。
- 页面主题为天蓝/白云浅色风格，颜色由 CSS 变量控制，不依赖图片素材。
- Python 轨道是受限 DSL，由正则和缩进解析器处理，不执行真实 Python 代码。
- 图形化和 Python 两条轨道已经实现。C++ 和 AI 关卡没有实现，只在研究报告中列为后续路线。
- 没有账号、后端、云同步、排行榜或付费系统。进度只存在当前浏览器，清除站点数据会丢失。
- 没有可视化的关卡编辑器。新增内容要直接改 TypeScript 场景包，并依靠测试校验。
- 视图状态不写入 URL，刷新页面会回到首页。
- 图形化变量名允许非 ASCII 字符，切到 Python 轨道运行时需要改成合法标识符。
- 没有浏览器端到端测试，真实页面上的布局和交互仍需要人工检查。
