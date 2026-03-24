export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function mergeDeep<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const val = (source as any)[key];
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof (target as any)[key] === "object"
    ) {
      (output as any)[key] = mergeDeep((target as any)[key], val);
    } else if (val !== undefined) {
      (output as any)[key] = val;
    }
  }
  return output;
}

let _counter = 0;
export function seq(): number {
  return ++_counter;
}
export function resetSeq(): void {
  _counter = 0;
}
export function randomAddress(): `0x${string}` {
  return `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(
    ""
  )}` as `0x${string}`;
}

/**
 * Applies DeepPartial overrides to a defaults object.
 * Centralizes the `overrides ? mergeDeep(...) : defaults` pattern used by every factory.
 */
export function applyOverrides<T extends Record<string, any>>(
  defaults: T,
  overrides?: DeepPartial<T>
): T {
  return overrides ? mergeDeep(defaults, overrides) : defaults;
}
