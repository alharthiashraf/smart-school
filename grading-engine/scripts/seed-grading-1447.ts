import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

console.log("URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SERVICE:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
}

const supabase = createClient(supabaseUrl, serviceKey);

type SeedRow = {
  stage_name: string;
  grade_name: string;
  track_name: string;
  subject_name: string;
  assessment_type: string;
  template_code: string;
  exam_time?: string;
  weekly_periods?: string;
  model_no?: string;
  second_round_note?: string;
  notes?: string;
};

type TemplateComponent = {
  component_key: string;
  component_name: string;
  max_score: number;
  display_order: number;
  component_type?: string;
  is_final_exam?: boolean;
};

function clean(value?: string | null) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}

function toNumberOrNull(value?: string | null) {
  const text = clean(value);
  if (!text) return null;

  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function getPaths() {
  const root = process.cwd();

  return {
    csvPath: path.join(
      root,
      "grading-engine",
      "data",
      "grading_seed_1447.csv"
    ),
    templatesDir: path.join(root, "grading-engine", "templates"),
  };
}

function loadTemplate(templateCode: string): TemplateComponent[] {
  if (!templateCode) return [];

  const { templatesDir } = getPaths();
  const templatePath = path.join(templatesDir, `${templateCode}.json`);

  if (!fs.existsSync(templatePath)) {
    console.warn(`⚠️ Template not found: ${templateCode}`);
    return [];
  }

  const raw = fs.readFileSync(templatePath, "utf8");

  try {
    const parsed = JSON.parse(raw) as TemplateComponent[];

    if (!Array.isArray(parsed)) {
      console.warn(`⚠️ Template is not an array: ${templateCode}`);
      return [];
    }

    return parsed
      .filter((item) => item.component_key && item.component_name)
      .map((item, index) => ({
        component_key: item.component_key,
        component_name: item.component_name,
        max_score: Number(item.max_score || 0),
        display_order: Number(item.display_order || index + 1),
        component_type: item.component_type || "درجة",
        is_final_exam: Boolean(item.is_final_exam),
      }));
  } catch (error) {
    console.error(`❌ Failed to parse template: ${templateCode}`, error);
    return [];
  }
}

function totalFromTemplate(template: TemplateComponent[]) {
  return template.reduce((sum, item) => sum + Number(item.max_score || 0), 0);
}

async function ensureSystem() {
  const { data, error } = await supabase
    .from("grading_systems")
    .upsert(
      {
        system_code: "SA_MOE",
        system_name: "نظام وزارة التعليم السعودية",
        country: "السعودية",
        description: "نظام توزيع الدرجات حسب دليل 1447هـ",
        is_active: true,
      },
      { onConflict: "system_code" }
    )
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error || new Error("Failed to create grading system");
  }

  return data.id as string;
}

async function ensureVersion(systemId: string) {
  const { data, error } = await supabase
    .from("grading_versions")
    .upsert(
      {
        version_code: "MOE_1447",
        version_name: "دليل توزيع الدرجات لجميع المراحل 1447هـ",
        academic_year: "1447",
        source_name: "إدارة تقويم الأداء المعرفي والمهاري",
        system_id: systemId,
        is_active: true,
      },
      { onConflict: "version_code" }
    )
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error || new Error("Failed to create grading version");
  }

  return data.id as string;
}

async function upsertScheme(row: SeedRow, versionId: string, totalScore: number) {
  const { data, error } = await supabase
    .from("grading_schemes")
    .upsert(
      {
        version_id: versionId,
        stage_name: row.stage_name,
        grade_name: row.grade_name,
        track_name: row.track_name || "عام",
        subject_name: row.subject_name,
        assessment_type: row.assessment_type,
        academic_year: "1447",
        semester: "الفصل الدراسي الأول",
        total_score: totalScore,
        second_round_note: clean(row.second_round_note),
        exam_time: clean(row.exam_time),
        weekly_periods: toNumberOrNull(row.weekly_periods),
        model_no: toNumberOrNull(row.model_no),
        notes: clean(row.notes),
        is_active: true,
      },
      {
        onConflict:
  "version_id,stage_name,grade_name,track_name,subject_name,semester",
      }
    )
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error || new Error(`Failed to upsert scheme: ${row.subject_name}`);
  }

  return data.id as string;
}

async function replaceComponents(
  schemeId: string,
  components: TemplateComponent[]
) {
  await supabase.from("grading_components").delete().eq("scheme_id", schemeId);

  if (components.length === 0) return;

  const rows = components.map((component) => ({
    scheme_id: schemeId,
    component_key: component.component_key,
    component_name: component.component_name,
    max_score: component.max_score,
    display_order: component.display_order,
    component_type: component.component_type || "درجة",
    is_final_exam: Boolean(component.is_final_exam),
  }));

  const { error } = await supabase.from("grading_components").insert(rows);

  if (error) {
    throw error;
  }
}

async function main() {
  const { csvPath, templatesDir } = getPaths();

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  if (!fs.existsSync(templatesDir)) {
    throw new Error(`Templates folder not found: ${templatesDir}`);
  }

  console.log("📄 Reading CSV:", csvPath);
  console.log("📁 Reading templates:", templatesDir);

  const csv = fs.readFileSync(csvPath, "utf8");

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as SeedRow[];

  console.log(`📊 Rows found: ${rows.length}`);

  const systemId = await ensureSystem();
  const versionId = await ensureVersion(systemId);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      if (
        !row.stage_name ||
        !row.grade_name ||
        !row.subject_name ||
        !row.assessment_type ||
        !row.template_code
      ) {
        skipped++;
        console.warn("⚠️ Skipped invalid row:", row);
        continue;
      }

      const template = loadTemplate(row.template_code);
      const totalScore = totalFromTemplate(template);

      const schemeId = await upsertScheme(row, versionId, totalScore);
      await replaceComponents(schemeId, template);

      imported++;
      console.log(
        `✅ ${row.stage_name} / ${row.grade_name} / ${row.track_name || "عام"} / ${
          row.subject_name
        }`
      );
    } catch (error) {
      failed++;
      console.error("❌ Import failed for row:", row);
      console.error(error);
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Imported: ${imported}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log("Done.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});