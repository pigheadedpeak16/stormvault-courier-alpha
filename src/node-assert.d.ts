declare module "node:assert/strict" {
  export function strictEqual(actual: unknown, expected: unknown, message?: string): void;
  export function ok(value: unknown, message?: string): void;

  const assert: {
    strictEqual: typeof strictEqual;
    ok: typeof ok;
  };

  export default assert;
}
