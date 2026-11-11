# LEVEL SCREEN — PLAY, DRAG, PLAYBACK

**Role:** the only interactive screen (score 8: 13 source files, ~4.6k source lines, 2,130-line `BlockEditor`). Earned a file because the run loop, the block tree editor and the playback clock interact and are easy to break.

## FILES
| File | Owns |
|------|------|
| `LevelScreen.tsx` | state machine: `program`, `pythonSource`, `result/score`, `frames/frameIndex/playing`, `resultOpen`, `attempts`; resets all on `level.id` change |
| `BlockEditor.tsx` | palette from `level.allowedCommands`, drag sessions via `data-drop-container` / `data-drag-handle` + `elementFromPoint` |
| `commandTree.ts` | pure `getContainer`/`getCommandTail`/`insertCommand`/`insertCommands`/`removeCommand`/`removeCommandTail`/`moveCommandStack`; paths alternate index + `body\|then\|else` |
| `playback.ts` | `buildPlaybackFrames` (N+1 frames, `rescued` keys), `PLAYBACK_STEP_MS = 280`, `PLAYBACK_END_DELAY_MS = 240` |
| `GridStage.tsx` | stateless render of one frame; rover position via `--agent-x/--agent-y/--agent-rotation` |
| `ResultModal.tsx` | stars, code/steps comparison, reference answer after win or 2 attempts |
| `level.css` | all `.level-*` / `.stage__*` styles; loaded once by `LevelScreen` |

## RUN FLOW (order matters)
1. Python track: `parseTextProgram(pythonCode)` → on error set `parseError` and abort; on success write tree back to `program` (blocks and text stay in sync).
2. `simulate` → `scoreRun` → `buildPlaybackFrames`; start playback, keep result hidden.
3. Playback ends (or "跳过播放") → `resultOpen` = true → only then `onComplete(levelId, stars)` when completed; `App` keeps the best stars.

## ANTI-PATTERNS
- NEVER call `onComplete` before playback finishes or twice per run — `finishedRef` guards it.
- NEVER read `result`/`score`/`onComplete` from inside the frame timer directly; they are mirrored into refs each render to avoid restarting the timer.
- NEVER implement tree edits imperatively in JSX; construct the next tree with `commandTree.ts` helpers (they return the input on invalid drops).
- NEVER reject a drop into any moved stack command by ad-hoc checks — `moveCommandStack` already rejects it via `isDescendantContainer`.
- NEVER add a `setTimeout`-driven state machine outside `LevelScreen`'s playback effect; tests only cover pure helpers.
- Do not render `display:none` list items for drop targets — the drop logic hits real elements only.

## GOTCHAS
- `moveCommandStack` takes `to` in *pre-removal* coordinates; it removes the source tail before inserting and adjusts ancestor index segments itself.
- Removing an `if`'s last `else` child must drop the `else` property entirely (keeps parse/format output unchanged).
- `pythonSource === null` means "not edited yet" → text is regenerated from blocks via `formatTextProgram`.
- The file is 2,130 lines with inline subcomponents; edit surgically instead of restyling the whole file.

## TEST FOCUS
`commandTree.test.ts` asserts structural equality across tail extract/remove/insert and whole-stack moves, rejects subtree drops, and checks that untouched nodes keep identity; `playback.test.ts` asserts frame count (N+1), first-visit ordering, and that the start cell never rescues. Anything involving timers, pointer events or React is untested — verify by playing.

## VERIFY
`bun test src/components/level` (commandTree + playback only). UI is untested — run `bun run dev` and play a level on both tracks.
