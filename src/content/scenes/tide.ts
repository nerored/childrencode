import type { ScenePack } from "../../domain/types";

/** 潮汐回廊 — 潮汐电站与水道巡检 (loops). */
export const TIDE: ScenePack = {
  scene: {
    id: "s02",
    name: "潮汐回廊",
    theme: "潮汐电站与水道巡检",
    conceptFocus: "loops",
    order: 2,
    chapters: [
      {
        id: "s02-c01",
        sceneId: "s02",
        name: "潮起潮落",
        order: 1,
        starGate: 15,
        checkpoints: [
          {
            id: "s02-c01-k01",
            chapterId: "s02-c01",
            name: "重复直行",
            order: 1,
            levelIds: ["s02-c01-k01-l01", "s02-c01-k01-l02"]
          },
          {
            id: "s02-c01-k02",
            chapterId: "s02-c01",
            name: "固定次数循环",
            order: 2,
            levelIds: ["s02-c01-k02-l01", "s02-c01-k02-l02"]
          },
          {
            id: "s02-c01-k03",
            chapterId: "s02-c01",
            name: "循环内转向",
            order: 3,
            levelIds: ["s02-c01-k03-l01", "s02-c01-k03-l02"]
          },
          {
            id: "s02-c01-k04",
            chapterId: "s02-c01",
            name: "水道巡检",
            order: 4,
            levelIds: ["s02-c01-k04-l01", "s02-c01-k04-l02"]
          }
        ]
      },
      {
        id: "s02-c02",
        sceneId: "s02",
        name: "循环往复",
        order: 2,
        starGate: 15,
        checkpoints: [
          {
            id: "s02-c02-k01",
            chapterId: "s02-c02",
            name: "嵌套循环",
            order: 1,
            levelIds: ["s02-c02-k01-l01", "s02-c02-k01-l02"]
          },
          {
            id: "s02-c02-k02",
            chapterId: "s02-c02",
            name: "循环与计数",
            order: 2,
            levelIds: ["s02-c02-k02-l01", "s02-c02-k02-l02"]
          },
          {
            id: "s02-c02-k03",
            chapterId: "s02-c02",
            name: "边界终止",
            order: 3,
            levelIds: ["s02-c02-k03-l01", "s02-c02-k03-l02"]
          },
          {
            id: "s02-c02-k04",
            chapterId: "s02-c02",
            name: "全廊收集",
            order: 4,
            levelIds: ["s02-c02-k04-l01", "s02-c02-k04-l02"]
          }
        ]
      }
    ]
  },
  levels: [
    {
      id: "s02-c01-k01-l01",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k01",
      index: 1,
      title: "潮线直行",
      brief: "退潮后的巡检线笔直通向潮标，把前进动作放进循环里，让小车一次走完五格，别越过边界。",
      hint: "重复五次前进一步。",
      grid: {
        width: 6,
        height: 6,
        obstacles: [{ x: 1, y: 1 }, { x: 3, y: 2 }, { x: 2, y: 4 }, { x: 5, y: 1 }]
      },
      start: { x: 0, y: 3, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 3 }, { x: 4, y: 3 }],
        target: { x: 5, y: 3 }
      },
      allowedCommands: ["forward", "repeat"],
      parCode: 3,
      parSteps: 5,
      standardAnswer: [
        {
          kind: "repeat",
          times: 5,
          body: [
            { kind: "forward", steps: 1 }
          ]
        }
      ],
      tutorial: [
        { text: "潮水退去，露出一条笔直的巡检线。", highlight: "grid" },
        { text: "把前进放进重复指令，设定循环次数。", highlight: "palette" },
        { text: "运行看看，循环结束时是否刚好停在潮标。", highlight: "run" }
      ]
    },
    {
      id: "s02-c01-k01-l02",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k01",
      index: 2,
      title: "顺潮而下",
      brief: "南侧水道顺流而下，沿线浮着一枚浮标；用固定次数的循环向下走四格，停在南端的闸门口。",
      hint: "循环四次，每次前进一格。",
      grid: {
        width: 5,
        height: 5,
        obstacles: [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 4 }]
      },
      start: { x: 4, y: 0, direction: "south" },
      goal: {
        kind: "collect",
        items: [{ x: 4, y: 2 }],
        target: { x: 4, y: 4 }
      },
      allowedCommands: ["forward", "repeat"],
      parCode: 3,
      parSteps: 4,
      standardAnswer: [
        {
          kind: "repeat",
          times: 4,
          body: [
            { kind: "forward", steps: 1 }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c01-k02-l01",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k02",
      index: 1,
      title: "两段潮标",
      brief: "潮水把巡航线分成两段，先重复两次前进两格收下浮标，再右转南下三格，抵达南侧观测台。",
      hint: "两段路各用一个循环。",
      grid: {
        width: 6,
        height: 6,
        obstacles: [{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 0 }, { x: 3, y: 2 }, { x: 5, y: 3 }, { x: 0, y: 4 }]
      },
      start: { x: 0, y: 1, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 1 }, { x: 4, y: 1 }],
        target: { x: 4, y: 4 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 6,
      parSteps: 8,
      standardAnswer: [
        {
          kind: "repeat",
          times: 2,
          body: [
            { kind: "forward", steps: 2 }
          ]
        },
        { kind: "turn", direction: "right" },
        {
          kind: "repeat",
          times: 3,
          body: [
            { kind: "forward", steps: 1 }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c01-k02-l02",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k02",
      index: 2,
      title: "定次巡行",
      brief: "东侧潮道要巡六格，再左转北上四格；两段距离都用固定次数循环表达，终点在东北角的水位柱。",
      hint: "先用重复三格走两步，再重复四步。",
      grid: {
        width: 7,
        height: 7,
        obstacles: [{ x: 0, y: 4 }, { x: 2, y: 3 }, { x: 4, y: 4 }, { x: 3, y: 6 }, { x: 5, y: 2 }, { x: 6, y: 6 }]
      },
      start: { x: 0, y: 5, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 5 }, { x: 6, y: 3 }],
        target: { x: 6, y: 1 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 6,
      parSteps: 11,
      standardAnswer: [
        {
          kind: "repeat",
          times: 3,
          body: [
            { kind: "forward", steps: 2 }
          ]
        },
        { kind: "turn", direction: "left" },
        {
          kind: "repeat",
          times: 4,
          body: [
            { kind: "forward", steps: 1 }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c01-k03-l01",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k03",
      index: 1,
      title: "潮湾回旋",
      brief: "潮湾呈方形回旋，三面各走两格并在转角右转；沿路收下两枚浮标，最后停在西侧岸台的灯下。",
      hint: "重复三次前进两格加右转。",
      grid: {
        width: 5,
        height: 5,
        obstacles: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 0, y: 1 }, { x: 4, y: 3 }, { x: 0, y: 0 }]
      },
      start: { x: 1, y: 1, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 3, y: 1 }, { x: 3, y: 3 }],
        target: { x: 1, y: 3 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 4,
      parSteps: 9,
      standardAnswer: [
        {
          kind: "repeat",
          times: 3,
          body: [
            { kind: "forward", steps: 2 },
            { kind: "turn", direction: "right" }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c01-k03-l02",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k03",
      index: 2,
      title: "循环转身",
      brief: "先循环两次走完两段折线，再沿西侧收下那枚浮标，最后左转向南两格，停在南岸的潮标旁。",
      hint: "循环两次后继续向西，再左转南下。",
      grid: {
        width: 5,
        height: 5,
        obstacles: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 0 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 0 }, { x: 0, y: 2 }],
        target: { x: 0, y: 4 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 7,
      parSteps: 11,
      standardAnswer: [
        {
          kind: "repeat",
          times: 2,
          body: [
            { kind: "forward", steps: 2 },
            { kind: "turn", direction: "right" }
          ]
        },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: []
    },
    {
      id: "s02-c01-k04-l01",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k04",
      index: 1,
      title: "环水巡查",
      brief: "巡检船要绕小岛一周：四次循环，每次前进两格后右转，依次收下三枚浮标，最后停回码头旁的栈桥。",
      hint: "四次循环绕岛一圈，再向前一格靠桥。",
      grid: {
        width: 6,
        height: 6,
        obstacles: [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 1, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 0 }]
      },
      start: { x: 0, y: 1, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 1 }, { x: 2, y: 3 }, { x: 0, y: 3 }],
        target: { x: 1, y: 1 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 5,
      parSteps: 13,
      standardAnswer: [
        {
          kind: "repeat",
          times: 4,
          body: [
            { kind: "forward", steps: 2 },
            { kind: "turn", direction: "right" }
          ]
        },
        { kind: "forward", steps: 1 }
      ],
      tutorial: []
    },
    {
      id: "s02-c01-k04-l02",
      sceneId: "s02",
      chapterId: "s02-c01",
      checkpointId: "s02-c01-k04",
      index: 2,
      title: "潮汐巡线",
      brief: "潮汐线路呈方角，先重复两次前进三格并右转，沿途收下两枚浮标，终点在东南角的观测点。",
      hint: "循环两次前进三格，每次右转。",
      grid: {
        width: 5,
        height: 5,
        obstacles: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }, { x: 2, y: 4 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 0 }, { x: 3, y: 2 }],
        target: { x: 3, y: 3 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 4,
      parSteps: 8,
      standardAnswer: [
        {
          kind: "repeat",
          times: 2,
          body: [
            { kind: "forward", steps: 3 },
            { kind: "turn", direction: "right" }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c02-k01-l01",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k01",
      index: 1,
      title: "梯级潮道",
      brief: "潮水在阶梯间涨落，外圈循环控制阶梯，内圈循环控制横向步数，沿梯收下两枚浮标后停在东侧平台。",
      hint: "外圈两次，内圈两次，每次右转下阶。",
      grid: {
        width: 5,
        height: 5,
        obstacles: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 0, y: 1 }, { x: 4, y: 0 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 0 }, { x: 4, y: 1 }],
        target: { x: 4, y: 2 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 7,
      parSteps: 10,
      standardAnswer: [
        {
          kind: "repeat",
          times: 2,
          body: [
            {
              kind: "repeat",
              times: 2,
              body: [
                { kind: "forward", steps: 1 }
              ]
            },
            { kind: "turn", direction: "right" },
            { kind: "forward", steps: 1 },
            { kind: "turn", direction: "left" }
          ]
        }
      ],
      tutorial: [
        { text: "阶梯潮道需要两层循环配合。", highlight: "grid" },
        { text: "外圈控制下阶，内圈控制每一级的横向步数。", highlight: "palette" },
        { text: "运行并观察两层循环如何一起走完梯级。", highlight: "run" }
      ]
    },
    {
      id: "s02-c02-k01-l02",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k01",
      index: 2,
      title: "双叠航线",
      brief: "两道潮汐航线叠在一起：外层循环两次，内层每次前进三格，右转下阶后再左转，终点在东北角。",
      hint: "外圈两次，内圈三次。",
      grid: {
        width: 7,
        height: 7,
        obstacles: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 3 }, { x: 0, y: 4 }, { x: 3, y: 4 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 3, y: 0 }, { x: 6, y: 1 }],
        target: { x: 6, y: 2 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 7,
      parSteps: 12,
      standardAnswer: [
        {
          kind: "repeat",
          times: 2,
          body: [
            {
              kind: "repeat",
              times: 3,
              body: [
                { kind: "forward", steps: 1 }
              ]
            },
            { kind: "turn", direction: "right" },
            { kind: "forward", steps: 1 },
            { kind: "turn", direction: "left" }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c02-k02-l01",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k02",
      index: 1,
      title: "数潮拾贝",
      brief: "潮线每隔一格浮起一枚贝壳，用两层循环数清三组、每组两格，沿直线收齐三枚后抵达东端。",
      hint: "外层循环三组，内层每组走两格。",
      grid: {
        width: 7,
        height: 5,
        obstacles: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 }]
      },
      start: { x: 0, y: 2, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 6, y: 2 }],
        target: { x: 6, y: 2 }
      },
      allowedCommands: ["forward", "repeat"],
      parCode: 4,
      parSteps: 6,
      standardAnswer: [
        {
          kind: "repeat",
          times: 3,
          body: [
            {
              kind: "repeat",
              times: 2,
              body: [
                { kind: "forward", steps: 1 }
              ]
            }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c02-k02-l02",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k02",
      index: 2,
      title: "螺旋计数",
      brief: "潮水沿方形螺旋退去，第一段用嵌套循环走六格，之后每段减少一格，收下三枚浮标后停在中心。",
      hint: "六、五、四、三，四段递减。",
      grid: {
        width: 7,
        height: 7,
        obstacles: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 2 }, { x: 1, y: 3 }, { x: 3, y: 4 }, { x: 5, y: 4 }, { x: 0, y: 6 }, { x: 4, y: 6 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 6, y: 0 }, { x: 6, y: 5 }, { x: 2, y: 5 }],
        target: { x: 2, y: 2 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 13,
      parSteps: 21,
      standardAnswer: [
        {
          kind: "repeat",
          times: 2,
          body: [
            {
              kind: "repeat",
              times: 3,
              body: [
                { kind: "forward", steps: 1 }
              ]
            }
          ]
        },
        { kind: "turn", direction: "right" },
        {
          kind: "repeat",
          times: 5,
          body: [
            { kind: "forward", steps: 1 }
          ]
        },
        { kind: "turn", direction: "right" },
        {
          kind: "repeat",
          times: 4,
          body: [
            { kind: "forward", steps: 1 }
          ]
        },
        { kind: "turn", direction: "right" },
        {
          kind: "repeat",
          times: 3,
          body: [
            { kind: "forward", steps: 1 }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c02-k03-l01",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k03",
      index: 1,
      title: "止于岸线",
      brief: "水位线正停在东岸，先重复五步恰好贴到边界，再右转重复五步到达南岸，途中收下两枚浮标。",
      hint: "两段都恰好走到边界就停。",
      grid: {
        width: 6,
        height: 6,
        obstacles: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 0, y: 3 }, { x: 1, y: 5 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 5, y: 0 }, { x: 5, y: 3 }],
        target: { x: 5, y: 5 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 6,
      parSteps: 11,
      standardAnswer: [
        {
          kind: "repeat",
          times: 5,
          body: [
            { kind: "forward", steps: 1 }
          ]
        },
        { kind: "turn", direction: "right" },
        {
          kind: "repeat",
          times: 5,
          body: [
            { kind: "forward", steps: 1 }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c02-k03-l02",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k03",
      index: 2,
      title: "沿岸折返",
      brief: "沿整条岸线巡查：向东六格到角，右转向南六格，再右转向西六格；两次转向都紧贴边界，不能多走。",
      hint: "每段六格，到边界立即转向。",
      grid: {
        width: 7,
        height: 7,
        obstacles: [{ x: 1, y: 1 }, { x: 3, y: 2 }, { x: 5, y: 3 }, { x: 2, y: 4 }, { x: 4, y: 5 }, { x: 1, y: 5 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 6, y: 0 }, { x: 6, y: 6 }],
        target: { x: 0, y: 6 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 9,
      parSteps: 20,
      standardAnswer: [
        {
          kind: "repeat",
          times: 6,
          body: [
            { kind: "forward", steps: 1 }
          ]
        },
        { kind: "turn", direction: "right" },
        {
          kind: "repeat",
          times: 6,
          body: [
            { kind: "forward", steps: 1 }
          ]
        },
        { kind: "turn", direction: "right" },
        {
          kind: "repeat",
          times: 6,
          body: [
            { kind: "forward", steps: 1 }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c02-k04-l01",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k04",
      index: 1,
      title: "长廊拾光",
      brief: "长走廊里有三枚浮灯，外圈循环三次走完梯级，内圈每次前进两格，沿路收齐后停在东南角。",
      hint: "外圈三次，内圈两次，每级右转下阶。",
      grid: {
        width: 7,
        height: 5,
        obstacles: [{ x: 1, y: 2 }, { x: 3, y: 3 }, { x: 5, y: 1 }, { x: 0, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 0 }, { x: 4, y: 1 }, { x: 6, y: 2 }],
        target: { x: 6, y: 3 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 7,
      parSteps: 15,
      standardAnswer: [
        {
          kind: "repeat",
          times: 3,
          body: [
            {
              kind: "repeat",
              times: 2,
              body: [
                { kind: "forward", steps: 1 }
              ]
            },
            { kind: "turn", direction: "right" },
            { kind: "forward", steps: 1 },
            { kind: "turn", direction: "left" }
          ]
        }
      ],
      tutorial: []
    },
    {
      id: "s02-c02-k04-l02",
      sceneId: "s02",
      chapterId: "s02-c02",
      checkpointId: "s02-c02-k04",
      index: 2,
      title: "回廊满仓",
      brief: "回廊尽头堆满潮货，先用嵌套循环收下两枚浮标，再右转南下、右转西行，最后左转抵达南侧仓门。",
      hint: "先完成两次梯级，再绕向南侧。",
      grid: {
        width: 5,
        height: 6,
        obstacles: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 0, y: 3 }, { x: 4, y: 0 }, { x: 1, y: 4 }]
      },
      start: { x: 0, y: 0, direction: "east" },
      goal: {
        kind: "collect",
        items: [{ x: 2, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 3 }],
        target: { x: 2, y: 5 }
      },
      allowedCommands: ["forward", "turn", "repeat"],
      parCode: 13,
      parSteps: 18,
      standardAnswer: [
        {
          kind: "repeat",
          times: 2,
          body: [
            {
              kind: "repeat",
              times: 2,
              body: [
                { kind: "forward", steps: 1 }
              ]
            },
            { kind: "turn", direction: "right" },
            { kind: "forward", steps: 1 },
            { kind: "turn", direction: "left" }
          ]
        },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 1 }
      ],
      tutorial: []
    }
  ]
};
