import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const ACCENT = [0, 136, 218];
const LIGHT  = [232, 242, 255];
const WHITE  = [255, 255, 255];
const BLACK  = [0, 0, 0];

function buildGuestPDF({ memberProfile, dateFrom, dateTo, guests }) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W   = pdf.internal.pageSize.width;

  pdf.setFillColor(...ACCENT);
  pdf.rect(0, 0, W, 14, "F");
  pdf.setTextColor(...WHITE);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("GUEST LIST REPORT", W / 2, 9.5, { align: "center" });

  pdf.setTextColor(...BLACK);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");   pdf.text("NAME :-",  12, 20);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile?.name || "", 30, 20);
  pdf.setFont("helvetica", "bold");   pdf.text("ID :-",    80, 20);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile?.memberId || memberProfile?.profileId || "", 90, 20);

  pdf.setFont("helvetica", "bold");   pdf.text("DATE FROM :", 12, 26);
  pdf.setFont("helvetica", "normal"); pdf.text(dateFrom || "", 35, 26);
  pdf.setFont("helvetica", "bold");   pdf.text("TO :",       70, 26);
  pdf.setFont("helvetica", "normal"); pdf.text(dateTo   || "", 78, 26);

  pdf.setDrawColor(180, 200, 230);
  pdf.setLineWidth(0.3);
  pdf.line(10, 30, W - 10, 30);

  const body = guests.map((g, i) => [
    i + 1,
    g.name        || "",
    g.mobile      || "",
    g.address     || "",
    g.occupation  || "",
    g.age         || "",
    g.date        || "",
  ]);

  autoTable(pdf, {
    startY: 33,
    head: [["Sl. No.", "Name", "Contact No.", "Address", "Occupation", "Age", "Date"]],
    body,
    styles: {
      fontSize: 8,
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      halign: "center",
      valign: "middle",
      lineColor: [180, 200, 230],
      lineWidth: 0.25,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: ACCENT,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 249, 255] },
    columnStyles: {
      0: { cellWidth: 13 },
      1: { cellWidth: 34, halign: "left" },
      2: { cellWidth: 28 },
      3: { cellWidth: 45, halign: "left" },
      4: { cellWidth: 28 },
      5: { cellWidth: 12 },
      6: { cellWidth: 22 },
    },
  });

  const finalY = pdf.lastAutoTable?.finalY || 40;
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Total Guests: ${guests.length}`, 12, finalY + 6);

  return pdf;
}

export function viewGuestPDF(opts) {
  try {
    const pdf  = buildGuestPDF(opts);
    const blob = pdf.output("blob");
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    if (!win) window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    
    throw e;
  }
}

export function downloadGuestPDF(opts) {
  try {
    const pdf      = buildGuestPDF(opts);
    const filename = `Guest-Report-${opts.memberProfile?.name || "report"}-${opts.dateFrom || ""}.pdf`;

    if (typeof window !== "undefined" && window.ReactNativeWebView) {
      const dataUri = pdf.output("datauristring");
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "DOWNLOAD_PDF", base64: dataUri, fileName: filename,
      }));
      return;
    }

    const blob = pdf.output("blob");
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) {
    
    throw e;
  }
}
