import type { LevelSpec, ScenePack, SceneSpec } from "../../domain/types";

const scene: SceneSpec = {
  id: "s04",
  name: "雾林岔路",
  theme: "雾林企鹅与路径选择",
  conceptFocus: "branching",
  order: 4,
  chapters: [
    {
      id: "s04-c01",
      sceneId: "s04",
      name: "岔路选择",
      order: 1,
      starGate: 15,
      checkpoints: [
        {
          id: "s04-c01-k01",
          chapterId: "s04-c01",
          name: "企鹅判断",
          order: 1,
          levelIds: ["s04-c01-k01-l01", "s04-c01-k01-l02"],
        },
        {
          id: "s04-c01-k02",
          chapterId: "s04-c01",
          name: "条件选路",
          order: 2,
          levelIds: ["s04-c01-k02-l01", "s04-c01-k02-l02"],
        },
        {
          id: "s04-c01-k03",
          chapterId: "s04-c01",
          name: "多路分支",
          order: 3,
          levelIds: ["s04-c01-k03-l01", "s04-c01-k03-l02"],
        },
        {
          id: "s04-c01-k04",
          chapterId: "s04-c01",
          name: "企鹅救出",
          order: 4,
          levelIds: ["s04-c01-k04-l01", "s04-c01-k04-l02"],
        },
      ],
    },
    {
      id: "s04-c02",
      sceneId: "s04",
      name: "复合判断",
      order: 2,
      starGate: 15,
      checkpoints: [
        {
          id: "s04-c02-k01",
          chapterId: "s04-c02",
          name: "组合条件",
          order: 1,
          levelIds: ["s04-c02-k01-l01", "s04-c02-k01-l02"],
        },
        {
          id: "s04-c02-k02",
          chapterId: "s04-c02",
          name: "嵌套分支",
          order: 2,
          levelIds: ["s04-c02-k02-l01", "s04-c02-k02-l02"],
        },
        {
          id: "s04-c02-k03",
          chapterId: "s04-c02",
          name: "分支优先级",
          order: 3,
          levelIds: ["s04-c02-k03-l01", "s04-c02-k03-l02"],
        },
        {
          id: "s04-c02-k04",
          chapterId: "s04-c02",
          name: "雾林终点",
          order: 4,
          levelIds: ["s04-c02-k04-l01", "s04-c02-k04-l02"],
        },
      ],
    },
  ],
};

const levels: LevelSpec[] = [
  {
    id: "s04-c01-k01-l01",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k01",
    index: 1,
    title: "企鹅在前",
    brief: "出发时企鹅就在正前方，先前进救出，再右转、左转各一次，沿拐角走到右侧的雾林救援基地。",
    hint: "if itemAhead 能判断下一格是否有企鹅。",
    grid: { width: 5, height: 5, obstacles: [{ x: 2, y: 0 }, { x: 4, y: 3 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 1, y: 0 }], target: { x: 2, y: 1 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 7,
    parSteps: 5,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
      },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 1 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 1 },
    ],
    tutorial: [
      { text: "itemAhead 只在前方一格有企鹅时成立。", highlight: "palette" },
      { text: "用 if itemAhead 救出企鹅，再用转弯绕到救援基地。", highlight: "grid" },
      { text: "运行后确认企鹅被救出，角色停在林间救援基地。", highlight: "run" },
    ],
    water: [{ x: 3, y: 0 }, { x: 0, y: 2 }]
  },
  {
    id: "s04-c01-k01-l02",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k01",
    index: 2,
    title: "侧位企鹅",
    brief: "正前方没有企鹅时改走右转支路，向南救出侧位企鹅，再左转沿横向小径走两格抵达雾林救援基地。",
    hint: "前方没有企鹅时用 else 转向。",
    grid: { width: 5, height: 5, obstacles: [{ x: 1, y: 0 }, { x: 2, y: 2 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 0, y: 1 }], target: { x: 2, y: 1 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 7,
    parSteps: 5,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          { kind: "turn", direction: "right" },
        ],
      },
      { kind: "forward", steps: 1 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
    ],
    tutorial: [],
    water: [{ x: 1, y: 1 }, { x: 0, y: 2 }]
  },
  {
    id: "s04-c01-k02-l01",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k02",
    index: 1,
    title: "雾中选路",
    brief: "西向小径被雾石堵住时左转向南，沿最右侧边缘走两格，救出道旁企鹅后停在前方林间空地。",
    hint: "前方受阻时，else 分支决定新的方向。",
    grid: { width: 5, height: 5, obstacles: [{ x: 3, y: 0 }, { x: 1, y: 2 }], corners: [] },
    start: { x: 4, y: 0, direction: "west" },
    goal: { kind: "rescued", items: [{ x: 4, y: 1 }], target: { x: 4, y: 2 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 5,
    parSteps: 3,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "pathAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          { kind: "turn", direction: "left" },
        ],
      },
      { kind: "forward", steps: 2 },
    ],
    tutorial: [],
    water: [{ x: 0, y: 3 }, { x: 0, y: 4 }]
  },
  {
    id: "s04-c01-k02-l02",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k02",
    index: 2,
    title: "绕行岔口",
    brief: "起点前方没有企鹅，先右转绕到侧道，再左转向北两格救出企鹅，最后右转东行一格到救援基地。",
    hint: "先判断企鹅，再用 else 处理空路。",
    grid: { width: 6, height: 6, obstacles: [{ x: 0, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }], corners: [] },
    start: { x: 0, y: 5, direction: "north" },
    goal: { kind: "rescued", items: [{ x: 1, y: 4 }], target: { x: 2, y: 3 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 9,
    parSteps: 7,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          { kind: "turn", direction: "right" },
        ],
      },
      { kind: "forward", steps: 1 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 1 },
    ],
    tutorial: [],
    water: [{ x: 0, y: 0 }, { x: 0, y: 1 }]
  },
  {
    id: "s04-c01-k03-l01",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k03",
    index: 1,
    title: "三岔企鹅",
    brief: "先判断前方企鹅，前进后再探测通路；被挡时右转南下，随后左转东行两格并右转抵达林间台阶。",
    hint: "嵌套 if 可以先看企鹅，再看通路。",
    grid: { width: 6, height: 6, obstacles: [{ x: 2, y: 0 }, { x: 1, y: 3 }, { x: 5, y: 4 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 1, y: 0 }, { x: 3, y: 2 }], target: { x: 3, y: 3 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 11,
    parSteps: 9,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "right" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 1 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 2 },
    ],
    tutorial: [],
    water: [{ x: 3, y: 0 }, { x: 0, y: 4 }]
  },
  {
    id: "s04-c01-k03-l02",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k03",
    index: 2,
    title: "多头分支",
    brief: "企鹅就在前方，取到后探测到障碍便右转北上三格，再左转沿横径西行五格，救出第二只企鹅。",
    hint: "内层判断失败时，转向走另一条支路。",
    grid: { width: 7, height: 6, obstacles: [{ x: 4, y: 5 }, { x: 6, y: 2 }, { x: 1, y: 5 }], corners: [] },
    start: { x: 6, y: 5, direction: "west" },
    goal: { kind: "rescued", items: [{ x: 5, y: 5 }, { x: 2, y: 2 }], target: { x: 0, y: 2 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 9,
    parSteps: 11,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "right" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 5 },
    ],
    tutorial: [],
    water: [{ x: 1, y: 2 }, { x: 0, y: 5 }]
  },
  {
    id: "s04-c01-k04-l01",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k04",
    index: 1,
    title: "收集路线",
    brief: "先取正前方企鹅，遇阻右转南下两格收第二枚，再左转东行三格拿下第三枚，最后前进一格到救援基地。",
    hint: "把两个条件叠在一起，取到企鹅再转弯。",
    grid: { width: 6, height: 6, obstacles: [{ x: 2, y: 0 }, { x: 3, y: 1 }, { x: 1, y: 4 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 4, y: 2 }], target: { x: 5, y: 2 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 10,
    parSteps: 9,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
      },
      {
        kind: "if",
        condition: { kind: "pathAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          { kind: "turn", direction: "right" },
        ],
      },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 3 },
      { kind: "forward", steps: 1 },
    ],
    tutorial: [],
    water: [{ x: 3, y: 0 }, { x: 0, y: 2 }]
  },
  {
    id: "s04-c01-k04-l02",
    sceneId: "s04",
    chapterId: "s04-c01",
    checkpointId: "s04-c01-k04",
    index: 2,
    title: "企鹅串联",
    brief: "沿西向小径连取两只企鹅，遇到雾石后左转南下，依次转向西、南，把散落的企鹅一路救出并停到救援基地。",
    hint: "救出所有企鹅后再到救援基地。",
    grid: { width: 7, height: 7, obstacles: [{ x: 3, y: 0 }, { x: 5, y: 4 }, { x: 4, y: 5 }], corners: [] },
    start: { x: 6, y: 0, direction: "west" },
    goal: { kind: "rescued", items: [{ x: 5, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 4 }], target: { x: 0, y: 6 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 17,
    parSteps: 17,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
      },
      {
        kind: "if",
        condition: { kind: "pathAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
      },
      {
        kind: "if",
        condition: { kind: "pathAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          { kind: "turn", direction: "left" },
        ],
      },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
    ],
    tutorial: [],
    water: [{ x: 0, y: 0 }, { x: 4, y: 1 }]
  },
  {
    id: "s04-c02-k01-l01",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k01",
    index: 1,
    title: "复合企鹅",
    brief: "企鹅在正前方，取到后还要再探测下一格；通路畅通就继续前进，随后右转南下三格收尾。",
    hint: "外层判断企鹅，内层判断通路。",
    grid: { width: 6, height: 6, obstacles: [{ x: 3, y: 0 }, { x: 0, y: 4 }, { x: 4, y: 2 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 1, y: 0 }, { x: 2, y: 2 }], target: { x: 2, y: 3 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 8,
    parSteps: 6,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "right" },
            ],
          },
        ],
      },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 3 },
    ],
    tutorial: [
      { text: "复合判断可以由外层与内层两个 if 组成。", highlight: "palette" },
      { text: "先判断企鹅，再判断通路，让角色逐格靠近救援基地。", highlight: "grid" },
      { text: "运行并检查两只企鹅是否都被救出。", highlight: "run" },
    ],
    water: [{ x: 2, y: 0 }, { x: 2, y: 1 }]
  },
  {
    id: "s04-c02-k01-l02",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k01",
    index: 2,
    title: "双层判断",
    brief: "取到前方企鹅后，内侧判断发现雾石挡路便右转；南下两格后左转东行，收下横径企鹅再到救援基地。",
    hint: "先判断再转向，确保每枚企鹅都被救出。",
    grid: { width: 7, height: 6, obstacles: [{ x: 2, y: 0 }, { x: 3, y: 1 }, { x: 1, y: 4 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 1, y: 0 }, { x: 3, y: 2 }], target: { x: 4, y: 2 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 10,
    parSteps: 8,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "right" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
      { kind: "forward", steps: 1 },
    ],
    tutorial: [],
    water: [{ x: 3, y: 0 }, { x: 0, y: 2 }]
  },
  {
    id: "s04-c02-k02-l01",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k02",
    index: 1,
    title: "嵌套岔口",
    brief: "前方没有企鹅时进入备用分支；若通路也被雾石封死，就右转向南走三格，救出侧位企鹅抵达救援基地。",
    hint: "if/else 可以按顺序表达分支优先级。",
    grid: { width: 5, height: 5, obstacles: [{ x: 1, y: 0 }, { x: 0, y: 4 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 0, y: 1 }], target: { x: 0, y: 3 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 7,
    parSteps: 4,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "right" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 3 },
    ],
    tutorial: [],
    water: [{ x: 0, y: 2 }, { x: 1, y: 4 }]
  },
  {
    id: "s04-c02-k02-l02",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k02",
    index: 2,
    title: "内层回廊",
    brief: "入口企鹅不在正前方，备用分支又判断受阻，于是左转西行三格；再右转北上收下两只企鹅，最后左转两格。",
    hint: "前面的条件优先，后面的条件兜底。",
    grid: { width: 6, height: 6, obstacles: [{ x: 5, y: 4 }, { x: 1, y: 1 }, { x: 4, y: 2 }], corners: [] },
    start: { x: 5, y: 5, direction: "north" },
    goal: { kind: "rescued", items: [{ x: 2, y: 4 }, { x: 2, y: 2 }], target: { x: 0, y: 2 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 11,
    parSteps: 11,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "left" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
    ],
    tutorial: [],
    water: [{ x: 1, y: 2 }, { x: 2, y: 3 }]
  },
  {
    id: "s04-c02-k03-l01",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k03",
    index: 1,
    title: "优先通行",
    brief: "企鹅判断排在最前，取到后不再走备用支路；右转南下，经侧道左转东行两格，停在内圈的救援基地。",
    hint: "嵌套判断时，先满足的条件先执行。",
    grid: { width: 6, height: 6, obstacles: [{ x: 2, y: 0 }, { x: 1, y: 2 }], corners: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 1, y: 0 }], target: { x: 3, y: 1 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 10,
    parSteps: 6,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 2 },
            ],
            else: [
              { kind: "turn", direction: "right" },
            ],
          },
        ],
      },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 1 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
    ],
    tutorial: [],
    water: [{ x: 3, y: 0 }, { x: 0, y: 2 }]
  },
  {
    id: "s04-c02-k03-l02",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k03",
    index: 2,
    title: "先后有别",
    brief: "企鹅不在正前方时先看通路，通路也被堵住才左转；北上取企鹅后右转东行两格，收下末端标记。",
    hint: "前面的条件优先，后面的条件兜底。",
    grid: { width: 5, height: 5, obstacles: [{ x: 1, y: 4 }, { x: 2, y: 2 }], corners: [] },
    start: { x: 0, y: 4, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 0, y: 3 }], target: { x: 2, y: 3 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 9,
    parSteps: 5,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
        ],
        else: [
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "left" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 1 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 2 },
    ],
    tutorial: [],
    water: [{ x: 0, y: 0 }, { x: 1, y: 3 }]
  },
  {
    id: "s04-c02-k04-l01",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k04",
    index: 1,
    title: "雾林终点",
    brief: "先取入口企鹅，遇阻左转北上三格收第二枚，再右转东行五格拿下第三枚，沿横径直奔雾林的救援基地。",
    hint: "入口企鹅、通路和转向要按顺序判断。",
    grid: { width: 7, height: 7, obstacles: [{ x: 2, y: 6 }, { x: 0, y: 4 }, { x: 4, y: 5 }, { x: 6, y: 0 }], corners: [] },
    start: { x: 0, y: 6, direction: "east" },
    goal: { kind: "rescued", items: [{ x: 1, y: 6 }, { x: 1, y: 3 }, { x: 5, y: 3 }], target: { x: 6, y: 3 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 9,
    parSteps: 11,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "left" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 5 },
    ],
    tutorial: [],
    water: [{ x: 0, y: 3 }, { x: 3, y: 6 }]
  },
  {
    id: "s04-c02-k04-l02",
    sceneId: "s04",
    chapterId: "s04-c02",
    checkpointId: "s04-c02-k04",
    index: 2,
    title: "归途企鹅",
    brief: "先取入口企鹅，绕开雾石后北上三格、左转西行四格、再右转北上三格；收齐企鹅后左转西行两格，再右转回到林门。",
    hint: "最后的路线要把三只企鹅全部收齐。",
    grid: { width: 8, height: 8, obstacles: [{ x: 5, y: 7 }, { x: 7, y: 5 }, { x: 4, y: 5 }, { x: 6, y: 2 }, { x: 1, y: 2 }], corners: [] },
    start: { x: 7, y: 7, direction: "west" },
    goal: { kind: "rescued", items: [{ x: 6, y: 7 }, { x: 2, y: 4 }, { x: 2, y: 1 }], target: { x: 0, y: 0 } },
    allowedCommands: ["if", "forward", "turn"],
    parCode: 15,
    parSteps: 19,
    standardAnswer: [
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [
          { kind: "forward", steps: 1 },
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [
              { kind: "forward", steps: 1 },
            ],
            else: [
              { kind: "turn", direction: "right" },
            ],
          },
        ],
      },
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 4 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "left" },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "right" },
      { kind: "forward", steps: 1 },
    ],
    tutorial: [],
    water: [{ x: 2, y: 2 }, { x: 0, y: 7 }]
  },
];

export const MIST: ScenePack = { scene, levels };
