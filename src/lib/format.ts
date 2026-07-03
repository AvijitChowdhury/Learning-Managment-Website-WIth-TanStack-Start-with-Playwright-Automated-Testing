// Bengali number/currency/date formatting.
const bdt = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});
const bnNum = new Intl.NumberFormat("bn-BD");
const bnDate = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatBDT(n: number | string | null | undefined): string {
  if (n == null) return bdt.format(0);
  const v = typeof n === "string" ? Number(n) : n;
  return bdt.format(isFinite(v) ? v : 0);
}
export function formatBnNumber(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  return bnNum.format(isFinite(v) ? v : 0);
}
export function formatBnDate(d: string | Date): string {
  return bnDate.format(typeof d === "string" ? new Date(d) : d);
}
export const fmtBDT = formatBDT;
