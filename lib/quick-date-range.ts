export type QuickDatePreset =
  | "today"
  | "this-week"
  | "this-month"
  | "this-quarter"
  | "this-year"
  | "ytd"
  | "custom";

export type QuickDateRange = { from: string; to: string };

type QuickDateOptions = {
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fiscalYearStartMonth?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function monthEnd(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
}

export function getQuickDateRange(
  preset: Exclude<QuickDatePreset, "custom">,
  now = new Date(),
  options: QuickDateOptions = {},
): QuickDateRange {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = localDateString(now);
  let from: Date;
  let to: Date;

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "this-week": {
      const weekStartsOn = options.weekStartsOn ?? 1;
      const offset = (now.getDay() - weekStartsOn + 7) % 7;
      from = new Date(year, month, now.getDate() - offset);
      return { from: localDateString(from), to: today };
    }
    case "this-month":
      from = monthStart(year, month);
      to = monthEnd(year, month);
      break;
    case "this-quarter": {
      const fiscalStartMonth = (options.fiscalYearStartMonth ?? 1) - 1;
      const monthsSinceFiscalStart = (month - fiscalStartMonth + 12) % 12;
      const quarterStartMonth = fiscalStartMonth + Math.floor(monthsSinceFiscalStart / 3) * 3;
      const quarterStartYear = year + Math.floor(quarterStartMonth / 12);
      const normalizedStartMonth = quarterStartMonth % 12;
      from = monthStart(quarterStartYear, normalizedStartMonth);
      to = monthEnd(quarterStartYear, normalizedStartMonth + 2);
      break;
    }
    case "this-year":
    case "ytd": {
      const fiscalStartMonth = (options.fiscalYearStartMonth ?? 1) - 1;
      const startYear = month < fiscalStartMonth ? year - 1 : year;
      from = monthStart(startYear, fiscalStartMonth);
      to = preset === "ytd" ? now : monthEnd(startYear + 1, fiscalStartMonth - 1);
      break;
    }
  }

  return { from: localDateString(from), to: localDateString(to) };
}

export function isValidDateRange(from: string, to: string) {
  const isDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };
  return isDate(from) && isDate(to) && from <= to;
}

export function formatQuickDateRange({ from, to }: QuickDateRange, locale?: string) {
  if (!from || !to) return "Choose a start and end date";
  const format = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(year, month - 1, day),
    );
  };
  return `${format(from)} – ${format(to)}`;
}
