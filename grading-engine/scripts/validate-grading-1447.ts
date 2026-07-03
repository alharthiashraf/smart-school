import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

type Row = {
  stage_name: string;
  grade_name: string;
  track_name: string;
  subject_name: string;
  assessment_type: string;
  template_code: string;
};

const csvPath = path.join(
  process.cwd(),
  "grading-engine",
  "data",
  "grading_seed_1447.csv"
);

const templatesDir = path.join(process.cwd(), "grading-engine", "templates");

const csv = fs.readFileSync(csvPath, "utf8");

const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,
}) as Row[];

let errors = 0;
const seen = new Set<string>();

for (const [index, row] of rows.entries()) {
  const line = index + 2;

  const required = [
    "stage_name",
    "grade_name",
    "track_name",
    "subject_name",
    "assessment_type",
    "template_code",
  ] as const;

  for (const field of required) {
    if (!row[field]) {
      console.error(`❌ Line ${line}: الحقل مفقود ${field}`);
      errors++;
    }
  }

  const key = [
    row.stage_name,
    row.grade_name,
    row.track_name,
    row.subject_name,
  ].join("|");

  if (seen.has(key)) {
    console.error(`❌ Line ${line}: تكرار مادة ${key}`);
    errors++;
  }

  seen.add(key);

  const templatePath = path.join(templatesDir, `${row.template_code}.json`);

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Line ${line}: قالب غير موجود ${row.template_code}`);
    errors++;
  }
}

console.log("━━━━━━━━━━━━━━━━━━━━");
console.log(`Rows: ${rows.length}`);
console.log(`Errors: ${errors}`);

if (errors > 0) {
  process.exit(1);
}

console.log("✅ CSV صالح للاستيراد");