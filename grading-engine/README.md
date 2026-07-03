# Grading Engine

محرك توزيع الدرجات الرسمي لمنصة المدرسة الذكية.

## الملفات

- `source/MOE_1447.pdf`
  - دليل توزيع الدرجات الأصلي.

- `data/grading_seed_1447.csv`
  - ملف البيانات المنظم الذي يتم استيراده إلى Supabase.

- `scripts/seed-grading-1447.ts`
  - سكربت الاستيراد إلى الجداول:
    - grading_systems
    - grading_versions
    - grading_schemes
    - grading_components

## تشغيل الاستيراد

```bash
npm run seed:grading