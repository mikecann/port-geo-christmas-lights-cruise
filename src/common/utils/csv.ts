// Excel and Sheets run a cell starting with one of these as a formula, and
// entry names are typed by the public, so those get a ' in front. Numbers
// (like negative coordinates) are left alone.
const FORMULA_START = /^[=+\-@\t\r]/;

export const escapeCSV = (value: string | number | boolean | undefined) => {
  if (value === undefined) return "";
  let str = String(value);
  if (typeof value === "string" && FORMULA_START.test(str)) str = `'${str}`;
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const toCsv = (
  headers: string[],
  rows: Array<Array<string | number | boolean | undefined>>,
) => [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");

export function downloadCsv(content: string, name: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  link.href = url;
  link.download = `${name}-${stamp}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
