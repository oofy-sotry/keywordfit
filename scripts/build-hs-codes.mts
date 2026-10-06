/**
 * 관세청 HS부호 XLSX 2종 → data/hs-codes.json
 *   입력: data/raw/hs-codes.xlsx (관세청_HS부호), data/raw/hs-units.xlsx (관세청_HS부호 단위별 품목명)
 *   실행: npm run build:hs   (매년 1월 새 파일이 나오면 다시 실행)
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { buildHsData, excelSerial, type HsBuildInput } from "../src/lib/hs/build.ts";

type Cell = ExcelJS.CellValue;

function text(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "richText" in value) return value.richText.map((r) => r.text).join("");
  return String(value);
}

function serial(value: Cell): number {
  if (value instanceof Date) return excelSerial(value);
  return Number(value);
}

/** 1행(제목) 제외, 각 행의 값 배열 (exceljs는 1부터 시작) */
async function readRows(path: string, sheetName?: string): Promise<Cell[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (!sheet) throw new Error(`시트 없음: ${path} ${sheetName ?? ""}`);
  const rows: Cell[][] = [];
  sheet.eachRow((row, index) => {
    if (index > 1) rows.push((row.values as Cell[]).slice(1));
  });
  return rows;
}

async function main() {
  const codeRows = await readRows("data/raw/hs-codes.xlsx");
  // 열: HS부호, 적용시작일자, 적용종료일자, 한글품목명, ...
  const codes = codeRows.map((r) => ({ code: text(r[0]), end: serial(r[2]), name: text(r[3]) }));

  const pairs = async (sheet: string) =>
    (await readRows("data/raw/hs-units.xlsx", sheet)).map((r) => [text(r[0]), text(r[1])] as [string, string]);

  const input: HsBuildInput = {
    codes,
    units4: await pairs("HS4단위"),
    units6: await pairs("HS6단위(5단위포함)"),
    units10: await pairs("HS10단위"),
  };
  const data = buildHsData(input, excelSerial(new Date()));
  writeFileSync("data/hs-codes.json", JSON.stringify(data));

  const count = (o: object) => Object.keys(o).length;
  console.log(
    `hs-codes.json: 4단위 ${count(data.units4)}, 5단위 ${count(data.units5)}, 6단위 ${count(data.units6)}, 10단위 ${count(data.codes10)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
