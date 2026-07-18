import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const sourcePdf = path.join(process.cwd(), "grading-engine", "source", "MOE_1447.pdf");
const outputTxt = path.join(process.cwd(), "grading-engine", "exports", "MOE_1447_raw.txt");
const outputCsv = path.join(process.cwd(), "grading-engine", "data", "grading_seed_1447.csv");

fs.mkdirSync(path.dirname(outputTxt), { recursive: true });

if (!fs.existsSync(sourcePdf)) {
  throw new Error("لم يتم العثور على ملف MOE_1447.pdf داخل grading-engine/source");
}

console.log("Extracting text from PDF...");

execSync(`pdftotext -layout "${sourcePdf}" "${outputTxt}"`, {
  stdio: "inherit",
});

const raw = fs.readFileSync(outputTxt, "utf8");

const header =
  "stage_name,grade_name,track_name,subject_name,assessment_type,template_code,exam_time,weekly_periods,model_no,second_round_note,notes\n";

const lines = raw
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const rows: string[] = [];

for (const line of lines) {
  if (
    line.includes("الرياضيات") ||
    line.includes("العلوم") ||
    line.includes("اللغة العربية") ||
    line.includes("اللغة الإنجليزية") ||
    line.includes("المهارات الرقمية") ||
    line.includes("الأحياء") ||
    line.includes("الكيمياء") ||
    line.includes("الفيزياء")
  ) {
    rows.push(`,,عام,${line},,40_20_40,,,,,`);
  }
}

fs.writeFileSync(outputCsv, header + rows.join("\n"), "utf8");

console.log(`Done. Draft CSV generated: ${outputCsv}`);
console.log("مهم: هذا ملف خام يحتاج مراجعة وتنظيف قبل seed.");
