import ExcelJS from "exceljs";

import { parseCsv } from "@/lib/csv";

const XLSX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

export function looksLikeXlsx(bytes: Uint8Array): boolean {
  return XLSX_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((fragment) => fragment.text).join("");
    }

    if ("result" in value) {
      return cellToString(value.result as ExcelJS.CellValue);
    }

    if ("hyperlink" in value && typeof value.text === "string") {
      return value.text;
    }

    return "";
  }

  return String(value);
}

export async function parseXlsx(data: ArrayBuffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const rows: string[][] = [];

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = Array.isArray(row.values) ? row.values : [];
    // row.values is 1-indexed; index 0 is unused.
    const cells = values.slice(1).map((value) => cellToString(value as ExcelJS.CellValue));
    rows.push(cells);
  });

  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.every((cell) => cell.trim() === "")) {
      rows.pop();
    } else {
      break;
    }
  }

  return rows;
}

export async function parseTabularFile(data: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(data);

  if (looksLikeXlsx(bytes)) {
    return parseXlsx(data);
  }

  return parseCsv(new TextDecoder("utf-8").decode(data));
}
