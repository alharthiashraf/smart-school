type CacheItem<T> = { value: T; expiresAt: number };

const memory = new Map<string, CacheItem<unknown>>();

export const CacheEngine = {
  set<T>(key: string, value: T, ttlMs = 5 * 60 * 1000) {
    memory.set(key, { value, expiresAt: Date.now() + ttlMs });
  },

  get<T>(key: string): T | null {
    const item = memory.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memory.delete(key);
      return null;
    }
    return item.value as T;
  },

  remove(key: string) {
    memory.delete(key);
  },

  clear(prefix?: string) {
    if (!prefix) {
      memory.clear();
      return;
    }
    Array.from(memory.keys()).forEach((key) => {
      if (key.startsWith(prefix)) memory.delete(key);
    });
  },
};

