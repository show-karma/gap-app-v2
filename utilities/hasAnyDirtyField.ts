// Recursively checks react-hook-form `dirtyFields`. Returns true if any leaf is truthy.
// RHF represents `dirtyFields` as a nested structure mirroring the form values:
// primitives become booleans, arrays become sparse arrays of booleans/objects,
// and objects become objects whose values follow the same rule recursively.
export const hasAnyDirtyField = (value: unknown): boolean => {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(hasAnyDirtyField);
  if (typeof value === "object") return Object.values(value).some(hasAnyDirtyField);
  return Boolean(value);
};
