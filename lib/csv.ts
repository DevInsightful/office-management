export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const normalized = withoutBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((cells, index) => !(index === rows.length - 1 && cells.length === 1 && cells[0] === ""));
}

export function normalizeCsvHeader(value: string): string {
  return value
    .replace(/^﻿/, "")
    .replace(/\*/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function findCsvColumnIndex(header: string[], expected: string): number {
  const normalizedExpected = normalizeCsvHeader(expected);
  return header.findIndex((cell) => normalizeCsvHeader(cell) === normalizedExpected);
}
