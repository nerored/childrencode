# CONTENT — LEVEL DATA

**Role:** the game's product data (score 7: `world.ts` is imported by 4 modules but the volume is in `scenes/`). One edit here ships 64 playable levels; every rule is enforced by tests, not runtime.

## FILES
| File | Owns |
|------|------|
| `world.ts` | `PACKS = [WINDMILL, TIDE, GEARS, MIST]`, `WORLD`, `ORDERED_LEVELS`, `allLevels/findLevel/findScene/findChapter/nextLevelIdInWorld` |
| `scenes/windmill.ts` | s01 风车原野 — movement (16 levels) |
| `scenes/tide.ts` | s02 潮汐回廊 — loops (16) |
| `scenes/gears.ts` | s03 齿轮工坊 — variables & conditions (16) |
| `scenes/mist.ts` | s04 雾林岔路 — branching (16) |
| `levels.test.ts` | shape, 64-level count, 3-star standard answers, title rules, clean-room name blocklist |

## ADDING A LEVEL (exact order)
1. Append a `LevelSpec` object in the right `scenes/*.ts` (id `sNN-cNN-kNN-lNN`, matching `sceneId/chapterId/checkpointId`, `index`).
2. Fill `grid` (5–8 cells per side), `start` (with direction), `goal.target` + `goal.items`, `allowedCommands`, `title/brief/hint`, `standardAnswer`.
3. Compute `parCode = codeLength(standardAnswer)` and `parSteps = simulate(...).steps` — never hand-wave them.
4. Add the id to a `CheckpointSpec.levelIds` (every checkpoint holds exactly 2 levels; chapters exactly 4 checkpoints; scenes exactly 2 chapters — restructuring needed for a net gain).
5. `bun test src/content`.

## ANTI-PATTERNS
- NEVER hand-write ids that break `^s\d{2}-c\d{2}-k\d{2}-l\d{2}$`; the validator also cross-checks the three parent ids.
- NEVER leave a command used by `standardAnswer` out of `allowedCommands` — no validator catches this, the block palette silently hides it.
- NEVER make a level solvable only with the text track; `allowedCommands` drives the block palette and both tracks share the same command tree.
- NEVER reuse Tencent scene/level names — `levels.test.ts` holds the blocklist and checks titles are 4–8 Han characters.
- NEVER make a standard answer longer than par or cheaper than par by editing one number only — `parCode`/`parSteps` must be derived, and tests assert the standard answer scores 3 stars.
- NEVER edit `world.ts` ordering casually: `PACKS` order = scene/level play order = unlock order = `nextLevelId`.

## GOTCHAS
- Grid coordinates are screen-space: `north` is `y - 1`; obstacles/items/target are `{x, y}` objects, not keys.
- Items must be reachable from `start` through non-obstacle cells (flood fill in `validateLevel`).
- `ChapterSpec.starGate` is currently 15 for every chapter; the scene gate (29/48) is a constant in `state/progress.ts`, not data.
- Scene packs import nothing but `domain/types` — keep them data-only.

## TEST FOCUS
`levels.test.ts` (64-level count, 3-star standard answers, title rules, Tencent blocklist) and `world.test.ts` (pack aggregation, ordered lookups, `nextLevelIdInWorld` edges). These run fast; run them after every content edit.

## VERIFY
`bun test src/content` (fast); `bun test` for the whole suite.
