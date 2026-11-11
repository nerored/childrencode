import type { ScenePack } from "../../domain/types";

/** 风车原野 — 风力农场与山谷运输 (movement). */
export const WINDMILL: ScenePack = {
  scene: {
    id: "s01",
    name: "风车原野",
    theme: "风力农场与山谷运输",
    conceptFocus: "movement",
    order: 1,
    chapters: [
      {
        id: "s01-c01",
        sceneId: "s01",
        name: "顺风起航",
        order: 1,
        starGate: 15,
        checkpoints: [
          {
            id: "s01-c01-k01",
            chapterId: "s01-c01",
            name: "起步与直行",
            order: 1,
            levelIds: ["s01-c01-k01-l01", "s01-c01-k01-l02"]
          },
          {
            id: "s01-c01-k02",
            chapterId: "s01-c01",
            name: "转向与对齐",
            order: 2,
            levelIds: ["s01-c01-k02-l01", "s01-c01-k02-l02"]
          },
          {
            id: "s01-c01-k03",
            chapterId: "s01-c01",
            name: "绕障通行",
            order: 3,
            levelIds: ["s01-c01-k03-l01", "s01-c01-k03-l02"]
          },
          {
            id: "s01-c01-k04",
            chapterId: "s01-c01",
            name: "运输综合",
            order: 4,
            levelIds: ["s01-c01-k04-l01", "s01-c01-k04-l02"]
          }
        ]
      },
      {
        id: "s01-c02",
        sceneId: "s01",
        name: "逆风校准",
        order: 2,
        starGate: 15,
        checkpoints: [
          {
            id: "s01-c02-k01",
            chapterId: "s01-c02",
            name: "精确步数",
            order: 1,
            levelIds: ["s01-c02-k01-l01", "s01-c02-k01-l02"]
          },
          {
            id: "s01-c02-k02",
            chapterId: "s01-c02",
            name: "连续转向",
            order: 2,
            levelIds: ["s01-c02-k02-l01", "s01-c02-k02-l02"]
          },
          {
            id: "s01-c02-k03",
            chapterId: "s01-c02",
            name: "窄道会车",
            order: 3,
            levelIds: ["s01-c02-k03-l01", "s01-c02-k03-l02"]
          },
          {
            id: "s01-c02-k04",
            chapterId: "s01-c02",
            name: "终点校验",
            order: 4,
            levelIds: ["s01-c02-k04-l01", "s01-c02-k04-l02"]
          }
        ]
      }
    ]
  },
  levels: [
    {
      id: "s01-c01-k01-l01",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k01",
      index: 1,
      title: "风车小径",
      brief: "西风把山谷吹得明亮，小车已经装好企鹅，请沿着修好的小路一路向东，抵达尽头那根救援基地。",
      hint: "前进四格就能到达，不必转向。",
      grid: { width: 5, height: 5, obstacles: [{ x: 2, y: 0 }, { x: 2, y: 4 }], corners: [] },
      start: { x: 0, y: 2, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 1, y: 2 }, { x: 3, y: 2 }], target: { x: 4, y: 2 } },
      allowedCommands: ["forward"],
      parCode: 2,
      parSteps: 4,
      standardAnswer: [
        { kind: "forward", steps: 4 }
      ],
      tutorial: [
        { text: "风车原野的起点已经亮起，先看清小车面朝的方向。", highlight: "grid" },
        { text: "在指令栏选择移动，方向保持前进，输入需要的格数。", highlight: "palette" },
        { text: "点击运行，让小车走到东侧的救援基地。", highlight: "run" }
      ],
      water: [{ x: 0, y: 0 }, { x: 0, y: 1 }]
    },
    {
      id: "s01-c01-k01-l02",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k01",
      index: 2,
      title: "田埂直行",
      brief: "北坡的田埂笔直延伸到河边，小车要逆着风稳稳前行，一直走到北端的救援基地旁，卸下随车的企鹅。",
      hint: "朝北连续前进四格。",
      grid: { width: 5, height: 5, obstacles: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 0 }], corners: [] },
      start: { x: 0, y: 4, direction: "north" },
      goal: { kind: "rescued", items: [], target: { x: 0, y: 0 } },
      allowedCommands: ["forward"],
      parCode: 2,
      parSteps: 4,
      standardAnswer: [
        { kind: "forward", steps: 4 }
      ],
      tutorial: [],
      water: [{ x: 0, y: 1 }, { x: 0, y: 2 }]
    },
    {
      id: "s01-c01-k02-l01",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k02",
      index: 1,
      title: "转角灯塔",
      brief: "绕过谷仓后需要转向，先沿东风直行两格，再右转朝南，停在南侧灯塔投下的阴影里完成交接。",
      hint: "先走两格，再右转走两格。",
      grid: { width: 5, height: 5, obstacles: [{ x: 3, y: 0 }, { x: 0, y: 3 }, { x: 4, y: 4 }], corners: [] },
      start: { x: 1, y: 1, direction: "east" },
      goal: { kind: "rescued", items: [], target: { x: 3, y: 3 } },
      allowedCommands: ["forward", "turn"],
      parCode: 4,
      parSteps: 5,
      standardAnswer: [
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 0, y: 0 }, { x: 3, y: 2 }]
    },
    {
      id: "s01-c01-k02-l02",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k02",
      index: 2,
      title: "南风转向",
      brief: "顺风向南收下第一枚风铃，再向东穿过田垄收下第二枚，最后右转向南，抵达集散点的木牌前。",
      hint: "先向南两格，转向东，再向南两格。",
      grid: { width: 6, height: 6, obstacles: [{ x: 1, y: 1 }, { x: 3, y: 4 }, { x: 5, y: 5 }], corners: [] },
      start: { x: 0, y: 0, direction: "south" },
      goal: { kind: "rescued", items: [{ x: 0, y: 2 }, { x: 4, y: 2 }], target: { x: 4, y: 4 } },
      allowedCommands: ["forward", "turn"],
      parCode: 6,
      parSteps: 10,
      standardAnswer: [
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 4 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 0, y: 1 }, { x: 4, y: 3 }]
    },
    {
      id: "s01-c01-k03-l01",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k03",
      index: 1,
      title: "风墙缺口",
      brief: "风墙横在原野中央，只留下一个缺口；沿南侧道路前行，从缺口北上，再把货物送到东北角的高台。",
      hint: "贴着南边走到缺口，再左转向北。",
      grid: { width: 5, height: 5, obstacles: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 4 }], corners: [] },
      start: { x: 0, y: 4, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 2, y: 2 }], target: { x: 4, y: 0 } },
      allowedCommands: ["forward", "turn"],
      parCode: 6,
      parSteps: 10,
      standardAnswer: [
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 4 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 2, y: 1 }, { x: 2, y: 3 }]
    },
    {
      id: "s01-c01-k03-l02",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k03",
      index: 2,
      title: "折风绕行",
      brief: "折线风道绕着草垛延伸，途中有一枚风铃；先向东再折向南，接着向东、向南，绕过障碍抵达东南角。",
      hint: "按东、南、东、南的顺序折行。",
      grid: { width: 6, height: 6, obstacles: [{ x: 2, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 3 }, { x: 1, y: 3 }, { x: 3, y: 4 }, { x: 0, y: 4 }], corners: [] },
      start: { x: 0, y: 0, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 3, y: 2 }], target: { x: 5, y: 5 } },
      allowedCommands: ["forward", "turn"],
      parCode: 8,
      parSteps: 13,
      standardAnswer: [
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 3 }
      ],
      tutorial: [],
      water: [{ x: 3, y: 1 }, { x: 5, y: 3 }]
    },
    {
      id: "s01-c01-k04-l01",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k04",
      index: 1,
      title: "风车运货",
      brief: "两袋麦种要送到北边的磨坊，先沿南侧道路向东，再左转北上，最后右转向东，穿过风车阵抵达卸货点。",
      hint: "向东三格，左转向北四格，再右转两格。",
      grid: { width: 6, height: 6, obstacles: [{ x: 4, y: 5 }, { x: 1, y: 4 }, { x: 2, y: 2 }, { x: 5, y: 3 }, { x: 0, y: 0 }], corners: [] },
      start: { x: 0, y: 5, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 2, y: 5 }, { x: 3, y: 3 }], target: { x: 5, y: 1 } },
      allowedCommands: ["forward", "turn"],
      parCode: 6,
      parSteps: 11,
      standardAnswer: [
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 4 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 3, y: 2 }, { x: 1, y: 5 }]
    },
    {
      id: "s01-c01-k04-l02",
      sceneId: "s01",
      chapterId: "s01-c01",
      checkpointId: "s01-c01-k04",
      index: 2,
      title: "山谷长运",
      brief: "山谷运输线有三处风铃，先沿南边直行，再北上穿过谷心，折向东、北上，依次收齐后把货送到北端。",
      hint: "四段行程：东四、北三、东二、北三。",
      grid: { width: 7, height: 7, obstacles: [{ x: 3, y: 5 }, { x: 5, y: 5 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 6, y: 4 }, { x: 1, y: 2 }], corners: [] },
      start: { x: 0, y: 6, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 2, y: 6 }, { x: 4, y: 4 }, { x: 6, y: 2 }], target: { x: 6, y: 0 } },
      allowedCommands: ["forward", "turn"],
      parCode: 8,
      parSteps: 15,
      standardAnswer: [
        { kind: "forward", steps: 4 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 3 }
      ],
      tutorial: [],
      water: [{ x: 6, y: 1 }, { x: 1, y: 6 }]
    },
    {
      id: "s01-c02-k01-l01",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k01",
      index: 1,
      title: "步数刻度",
      brief: "逆风路段每一格都要算准，先向东走三格贴着风墙停下，再右转南下四格，抵达南侧的刻度桩旁。",
      hint: "先走三格再转向，别撞上东侧风墙。",
      grid: { width: 5, height: 5, obstacles: [{ x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 2, y: 4 }, { x: 0, y: 3 }], corners: [] },
      start: { x: 0, y: 0, direction: "east" },
      goal: { kind: "rescued", items: [], target: { x: 3, y: 4 } },
      allowedCommands: ["forward", "turn"],
      parCode: 4,
      parSteps: 8,
      standardAnswer: [
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 4 }
      ],
      tutorial: [
        { text: "逆风路段的格子就是刻度，先数清要走的格数。", highlight: "grid" },
        { text: "输入精确的前进步数，再补上转向指令。", highlight: "palette" }
      ],
      water: [{ x: 3, y: 1 }, { x: 3, y: 2 }]
    },
    {
      id: "s01-c02-k01-l02",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k01",
      index: 2,
      title: "精准折返",
      brief: "早晨的测风任务需要精确折返：向南三步，右转向西四步救出企鹅，再左转向南走完最后两格。",
      hint: "南三、西四、南二，步数不能多。",
      grid: { width: 6, height: 6, obstacles: [{ x: 5, y: 4 }, { x: 5, y: 5 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 0, y: 3 }], corners: [] },
      start: { x: 5, y: 0, direction: "south" },
      goal: { kind: "rescued", items: [{ x: 3, y: 3 }], target: { x: 1, y: 5 } },
      allowedCommands: ["forward", "turn"],
      parCode: 6,
      parSteps: 11,
      standardAnswer: [
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 4 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 5, y: 1 }, { x: 5, y: 2 }]
    },
    {
      id: "s01-c02-k02-l01",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k02",
      index: 1,
      title: "连环转身",
      brief: "风塔四周需要逐面检查，先绕外圈连续右转，让小车贴边走满三面，最后停在西侧的救援基地旁。",
      hint: "四次前进配合三次右转。",
      grid: { width: 5, height: 5, obstacles: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 1 }], corners: [] },
      start: { x: 0, y: 0, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 4, y: 4 }], target: { x: 1, y: 2 } },
      allowedCommands: ["forward", "turn"],
      parCode: 8,
      parSteps: 16,
      standardAnswer: [
        { kind: "forward", steps: 4 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 4 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 4, y: 1 }, { x: 0, y: 3 }]
    },
    {
      id: "s01-c02-k02-l02",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k02",
      index: 2,
      title: "折线校准",
      brief: "折线风道穿过草场，先向北两格，右转向东救出企鹅，再左转北上，最后右转抵达东北角的测风站。",
      hint: "北二、东二、北二、东三。",
      grid: { width: 6, height: 6, obstacles: [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 4 }, { x: 3, y: 2 }, { x: 4, y: 3 }, { x: 5, y: 3 }], corners: [] },
      start: { x: 0, y: 5, direction: "north" },
      goal: { kind: "rescued", items: [{ x: 2, y: 3 }], target: { x: 5, y: 1 } },
      allowedCommands: ["forward", "turn"],
      parCode: 8,
      parSteps: 12,
      standardAnswer: [
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 3 }
      ],
      tutorial: [],
      water: [{ x: 2, y: 2 }, { x: 0, y: 4 }]
    },
    {
      id: "s01-c02-k03-l01",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k03",
      index: 1,
      title: "窄道错身",
      brief: "两侧的草垛把道路挤成一条窄缝，只能贴着中线前行，在拐角处左转，从北侧救援基地离开这段窄道。",
      hint: "沿窄道走两格后左转。",
      grid: { width: 5, height: 5, obstacles: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }], corners: [] },
      start: { x: 0, y: 2, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 2, y: 2 }], target: { x: 2, y: 0 } },
      allowedCommands: ["forward", "turn"],
      parCode: 4,
      parSteps: 5,
      standardAnswer: [
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 2, y: 1 }, { x: 1, y: 2 }]
    },
    {
      id: "s01-c02-k03-l02",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k03",
      index: 2,
      title: "回廊窄径",
      brief: "木栈道在风车之间折成窄廊，先向东穿过第一段，右转南下，再左转东行，最后右转抵达南端救援基地。",
      hint: "东三、南三、东二、南二。",
      grid: { width: 6, height: 6, obstacles: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }], corners: [] },
      start: { x: 0, y: 0, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 3, y: 2 }], target: { x: 5, y: 5 } },
      allowedCommands: ["forward", "turn"],
      parCode: 8,
      parSteps: 13,
      standardAnswer: [
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 2 }
      ],
      tutorial: [],
      water: [{ x: 3, y: 1 }, { x: 5, y: 4 }]
    },
    {
      id: "s01-c02-k04-l01",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k04",
      index: 1,
      title: "坐标落点",
      brief: "终点校验要求落点准确：从南侧出发北上三格，右转向东时救出企鹅，再左转北上最后一格，不能走错。",
      hint: "北三、东三、北一。",
      grid: { width: 6, height: 6, obstacles: [{ x: 0, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 4 }, { x: 5, y: 2 }], corners: [] },
      start: { x: 1, y: 5, direction: "north" },
      goal: { kind: "rescued", items: [{ x: 4, y: 2 }], target: { x: 4, y: 1 } },
      allowedCommands: ["forward", "turn"],
      parCode: 6,
      parSteps: 9,
      standardAnswer: [
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 1 }
      ],
      tutorial: [],
      water: [{ x: 1, y: 3 }, { x: 1, y: 4 }]
    },
    {
      id: "s01-c02-k04-l02",
      sceneId: "s01",
      chapterId: "s01-c02",
      checkpointId: "s01-c02-k04",
      index: 2,
      title: "风标终点",
      brief: "最后的运输单上有两只企鹅，沿东侧道路前行后左转北上，收齐后再折向东，最后左转到北端救援基地。",
      hint: "东三、北二、东三、北一。",
      grid: { width: 7, height: 7, obstacles: [{ x: 1, y: 2 }, { x: 2, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 3 }, { x: 6, y: 2 }, { x: 0, y: 5 }], corners: [] },
      start: { x: 0, y: 3, direction: "east" },
      goal: { kind: "rescued", items: [{ x: 3, y: 1 }, { x: 5, y: 1 }], target: { x: 6, y: 0 } },
      allowedCommands: ["forward", "turn"],
      parCode: 8,
      parSteps: 12,
      standardAnswer: [
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 2 },
        { kind: "turn", direction: "right" },
        { kind: "forward", steps: 3 },
        { kind: "turn", direction: "left" },
        { kind: "forward", steps: 1 }
      ],
      tutorial: [],
      water: [{ x: 3, y: 2 }, { x: 0, y: 4 }]
    }
  ]
};
