# ENGINE — PURE RULES

**Role:** headless rule layer (score 10: no config, but every rule lives here and `docs/architecture.md` §4/§6 specifies it). Exports: `simulate`, `scoreRun`, `codeLength`, `validateLevel`, `validateScene`, `parseTextProgram`, `formatTextProgram` (the last lives in `domain/commands.ts`).

## FILES
| File | Owns |
|------|------|
| `simulate.ts` | execution: `MAX_ACTIONS = 1000`, `MAX_REPEAT = 100`, `nonNegativeInteger` clamping |
| `score.ts` | `codeLength = 1 + countCommands(program)`, 3-star formula |
| `parse.ts` | line tokenizer (2-space indent, `//` comments) + `ParseError` |
| `validate.ts` | `LEVEL_ID_PATTERN`, `MIN_GRID 5`/`MAX_GRID 8`, flood-fill reachability, standard-answer replay |

## SEMANTICS THAT FAIL SILENTLY IF CHANGED
- Only `forward` (per cell entered) and `turn` spend a step; `repeat`/`if`/`setVar`/`changeVar` are free. The action cap is checked *before* the move, so the 1001st action yields `max-steps` and the rover stays put.
- Order of forward checks: bounds (`out-of-bounds`) → obstacle (`obstacle`) → budget; the run aborts on the first failure — no partial `forward` continuation.
- `repeat.times`: floor, <1 or non-finite → 0, capped at 100. `forward.steps` likewise floors to 0, so negative steps never move backwards.
- `if` branches: missing `else` is a no-op; `itemAhead` ignores already-collected cells; `varAtLeast` compares unset vars as 0.
- Completion: run finished AND on `goal.target` AND all `goal.items` collected — otherwise `incomplete`. `Goal.kind` ("reach"/"collect") is display-only.
- Code length counts each branch of `if` and the loop body once.

## ANTI-PATTERNS
- NEVER read `Math.random`, `Date`, `window` or React here — determinism is the contract tests rely on; no file in `engine/` imports anything except `domain/`.
- NEVER make `parseTextProgram` throw for user input: failures return `{ program: [], error: "Line N: …" }`; only `ParseError` is swallowed, other exceptions rethrow.
- NEVER loosen `validateLevel` to silence a content bug; it also checks `parCode`/`parSteps` equality against `standardAnswer` and item reachability.
- NEVER add a level-specific special case to `simulate` — content must conform to the rule set, not the reverse.

## TEST FOCUS
`simulate.test.ts` pins the caps (1000th action accepted, 1001st → `max-steps`), the 100-repeat clamp, and negative/fractional step clamping; `parse.test.ts` pins error strings and 2-space indentation; `validate.test.ts` builds invalid levels one defect at a time; `score.test.ts` pins `codeLength` and the star matrix. Extend the matching test when you touch a rule — do not weaken an assertion to get green.

## VERIFY
`bun test src/engine` — simulate/parse/score/validate each have a sibling `.test.ts`; `src/content/levels.test.ts` replays all 64 `standardAnswer`s.
