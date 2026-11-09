export function formatCoord(value: number, digits = 5): string {
  return value.toFixed(digits);
}

export function formatDateId(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCount(value: number): string {
  return value.toLocaleString("id-ID");
}

export function formatDecimal(value: number, digits = 1): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
