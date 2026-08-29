(() => {
  try {
    void globalThis.localStorage.length;
    return;
  } catch {
    const values = new Map();
    const memoryStorage = {
      get length() {
        return values.size;
      },
      clear() {
        values.clear();
      },
      getItem(key) {
        const normalized = String(key);
        return values.has(normalized) ? values.get(normalized) : null;
      },
      key(index) {
        return [...values.keys()][Number(index)] ?? null;
      },
      removeItem(key) {
        values.delete(String(key));
      },
      setItem(key, value) {
        values.set(String(key), String(value));
      },
    };
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: memoryStorage,
    });
    Object.defineProperty(globalThis, "__karmaMemoryStorageShim", {
      configurable: false,
      value: true,
    });
  }
})();
