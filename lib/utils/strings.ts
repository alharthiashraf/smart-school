function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\u064B-\u0652]/g, "")
    .trim();
}

export function includesArabic(value: string | null | undefined, search: string) {
  const source = normalizeArabic(String(value ?? ""));
  const target = normalizeArabic(search);

  if (!target) return true;
  return source.includes(target);
}
