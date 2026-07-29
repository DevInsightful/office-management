export type SortDirection = "asc" | "desc";

export function normalizeSortDirection(value?: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

export function matchesSearch(search: string, ...values: Array<string | number | null | undefined>) {
  if (!search) {
    return true;
  }

  const normalizedSearch = search.trim().toLowerCase();

  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedSearch),
  );
}

export function compareStrings(left: string, right: string, direction: SortDirection) {
  return left.localeCompare(right) * (direction === "asc" ? 1 : -1);
}

export function compareNumbers(left: number, right: number, direction: SortDirection) {
  return (left - right) * (direction === "asc" ? 1 : -1);
}

export function buildSortHref(
  pathname: string,
  params: Record<string, string | undefined>,
  column: string,
  currentSort: string,
  currentDir: SortDirection,
) {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "sort" || key === "dir") {
      continue;
    }

    next.set(key, value);
  }

  next.set("sort", column);
  next.set("dir", currentSort === column && currentDir === "asc" ? "desc" : "asc");

  return `${pathname}?${next.toString()}`;
}
