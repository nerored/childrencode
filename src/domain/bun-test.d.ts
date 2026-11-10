/**
 * Minimal local typings for `bun:test`.
 *
 * The project does not install `bun-types`, and this task may not change
 * package.json or tsconfig.json, so declare the small surface the domain tests
 * use. Replace this file with `@types/bun` when the workspace adds it.
 */
declare module "bun:test" {
  export interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toStrictEqual(expected: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toContain(expected: unknown): void;
    toHaveLength(expected: number): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toThrow(expected?: unknown): void;
    toMatch(expected: RegExp | string): void;
    toMatchObject(expected: object): void;
    readonly not: Matchers;
  }

  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => unknown): void;
  export function it(name: string, fn: () => unknown): void;
  export function expect(value: unknown): Matchers;
}
