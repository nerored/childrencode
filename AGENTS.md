# PROJECT KNOWLEDGE BASE

**Generated:** 2026-11-10
**Commit:** 9c803b6
**Branch:** main

## OVERVIEW
ChildrenCode: a static single-page kids' coding game (four islands, 64 grid-maze levels) that accepts either a drag-and-drop block program or a Python-like text DSL. Pure client side — Vite 8 + React 19 + TypeScript 7 (strict), Bun for install/test/build, no backend, no router; progress lives only in `localStorage`.

## STRUCTURE
```
childrencode/
├── src/
│   ├── main.tsx            # createRoot + <StrictMode>; imports styles.css
│   ├── App.tsx             # sole screen-switcher: View union, track, progress
│   ├── domain/             # types.ts (single type contract) + commands.ts helpers
│   ├── engine/             # pure parse / simulate / score / validate
│   ├── content/            # world.ts aggregation; scenes/*.ts = 64 levels of data
│   ├── state/              # progress.ts: localStorage doc + unlock rules
│   └── components/         # home, world, chapter, level screens, common
├── docs/architecture.md    # authoritative engine semantics + content rules
└── .github/workflows/deploy.yml  # push to main -> GitHub Pages
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add / edit a level | `src/content/scenes/` (windmill, tide, gears, mist) | see `src/content/AGENTS.md` |
| Run/score semantics | `src/engine/simulate.ts`, `src/engine/score.ts` | `docs/architecture.md` §4 is the spec |
| Text DSL grammar | `src/engine/parse.ts` | formatter counterpart: `formatTextProgram` in `domain/commands.ts` |
| Unlock rules / storage | `src/state/progress.ts` | star-only derivation, `childrencode.progress.v1` |
| Level screen wiring | `src/components/level/LevelScreen.tsx` | run -> score -> playback -> result -> `onComplete` |
| Block drag/drop tree edits | `src/components/level/commandTree.ts` | pure path-based insert/remove/move |
| Palette, theme, scene colors | `src/styles.css` | `:root` block, ~127 custom properties |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `types.ts` (Command, LevelSpec, WorldSpec…) | types | `src/domain/types.ts` | 20 importers | the one shared contract; change here first |
| `cellKey` / `stepPoint` / `turnDirection` | fn | `src/domain/commands.ts` | 8 importers | coordinate + heading math |
| `simulate` | fn | `src/engine/simulate.ts` | 2 | deterministic program execution |
| `scoreRun` / `codeLength` | fn | `src/engine/score.ts` | 2 | star formula |
| `validateLevel` / `validateScene` | fn | `src/engine/validate.ts` | 2 | content integrity (tests only) |
| `WORLD` / `allLevels` / `findLevel` | const/fn | `src/content/world.ts` | 4 | content aggregation + lookups |
| `loadProgress` / `isLevelUnlocked` / `nextLevelId` | fn | `src/state/progress.ts` | 5 | persistence + star gates |

## CONVENTIONS
- Layer direction is one-way: `domain` ← `engine`, `content`, `state` ← `components`/`App`. Only `state/progress.ts` touches `localStorage`; only `components` import `react`/`react-dom`.
- Tests sit next to sources as `*.test.ts` (never `.tsx`), import from `bun:test`, list 198 cases across 14 files. There is no React/DOM test setup — UI is verified by playing it.
- `domain/bun-test.d.ts` is a hand-written shim because `bun-types`/`@types/bun` is intentionally not a dependency; only add matchers there when a test needs one.
- Class names are BEM (`level-screen__...`, `button--primary`), hand-written in two global sheets; no CSS modules, no CSS-in-JS, no UI library.
- All user-facing copy is Chinese (zh-CN); identifiers, comments and docs-in-code are English except files under `docs/`.
- Absolute-positioned rover is driven by CSS vars `--agent-x/--agent-y/--agent-rotation` + `--stage-cols` set from React; animation is a CSS transition (280ms), not JS.

## ANTI-PATTERNS (THIS PROJECT)
- NEVER make `engine/`, `domain/` or `content/` depend on React, DOM or storage — they must run headless under `bun test`.
- NEVER mutate the `Command` tree in place; `commandTree.ts` mutators are immutable and tests assert identity preservation of untouched nodes.
- NEVER duplicate a level's `standardAnswer` numbers by hand into `parCode`/`parSteps` without running `validateLevel` — the validator enforces `parCode === codeLength(standardAnswer)` and `parSteps === simulate(...).steps`.
- NEVER rescue a penguin on the start cell during playback; `playback.ts` counts only penguins whose cell a `forward` trace entry enters.
- NEVER retry a level expecting fewer stars — `recordResult` keeps the historical maximum.
- Level and scene titles are unique across the project (`levels.test.ts`), so a new level never duplicates an existing name.

## UNIQUE STYLES
- Engine semantics are deliberate: coordinate system is screen-space (`north = y-1`); turns and forward moves each cost 1 step; vars/conditions/loops cost 0; 1000-action hard cap; `repeat` clamped to 100 and loop body counted once for code length.
- Parse/format are symmetric: anything `formatTextProgram` emits must re-parse to the same tree.
- One reusable-content threshold: level ids must match `sNN-cNN-kNN-lNN`; grids 5–8 cells; titles 4–8 Han characters.

## COMMANDS
```bash
bun install            # deps (Bun-managed; bun.lock is the lockfile)
bun run dev            # Vite dev server
bun test               # bun:test, no DOM
bun run typecheck      # tsc --noEmit (needs node_modules for vite/client types)
bun run build          # vite build -> dist/ (base "./")
bun run verify         # typecheck && test && build — CI does NOT run this, deploy.yml runs --frozen-lockfile install + build only
```

## NOTES
- Fresh clone has no `node_modules`: `bun run typecheck` then fails with TS2688 (`Cannot find type file 'vite/client'`) — run `bun install` first. `bun test` still works without deps.
- No URL routing: refresh always lands on home (`App.tsx` `View` state).
- Deployment is a push to `main`; there is no staging environment and no versioned API.
