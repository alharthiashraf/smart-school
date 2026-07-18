function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

export const SearchEngine = {
  normalize,

  includes(haystack: unknown, needle: unknown) {
    const query = normalize(needle);
    if (!query) return true;
    return normalize(haystack).includes(query);
  },

  filter<T>(items: T[], query: string, fields: Array<keyof T | ((item: T) => unknown)>) {
    const q = normalize(query);
    if (!q) return items;

    return items.filter((item) =>
      fields.some((field) => {
        const value = typeof field === "function" ? field(item) : item[field];
        return normalize(value).includes(q);
      }),
    );
  },
};

