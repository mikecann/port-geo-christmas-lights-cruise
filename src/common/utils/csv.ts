export const escapeCSV = (value: string | number | boolean | undefined) => {
  if (value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
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
