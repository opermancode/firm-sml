import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSampleWorkbook, buildTemplateWorkbook } from "../src/lib/template";

async function main() {
  const outDir = path.join(process.cwd(), "public", "templates");
  await mkdir(outDir, { recursive: true });

  const today = new Date();
  const templatePath = path.join(outDir, "FIRM-Fleet-Import-Template.xlsx");
  const samplePath = path.join(outDir, "FIRM-Sample-Fleet.xlsx");

  await writeFile(templatePath, buildTemplateWorkbook(today));
  await writeFile(samplePath, buildSampleWorkbook(today));

  console.log(`Wrote ${path.relative(process.cwd(), templatePath)}`);
  console.log(`Wrote ${path.relative(process.cwd(), samplePath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
