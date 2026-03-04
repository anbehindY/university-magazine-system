import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export tabular data as an Excel (.xlsx) file.
 * Triggers a browser download with the given filename.
 */
export function exportToExcel(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Export tabular data as a PDF file (landscape A4).
 * Includes a title, generated date, and auto-formatted table.
 * Triggers a browser download with the given filename.
 */
export function exportToPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 20);

  // Generated date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  // Reset text color for table
  doc.setTextColor(0, 0, 0);

  // Table
  autoTable(doc as Parameters<typeof autoTable>[0], {
    head: [headers],
    body: rows,
    startY: 34,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [51, 65, 85] },
  });

  doc.save(filename);
}
