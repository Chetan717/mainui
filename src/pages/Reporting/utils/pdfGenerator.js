import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const DAYS  = ["THURSDAY","FRIDAY","SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY"];
const ACCENT = [14, 36, 92];
const LIGHT  = [232, 240, 255];
const WHITE  = [255, 255, 255];

function buildPDF({ memberProfile, dateFrom, dateTo, dayData }) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W   = pdf.internal.pageSize.width;

  // ── Banner ────────────────────────────────────────────────────
  pdf.setFillColor(...ACCENT);
  pdf.rect(0, 0, W, 14, "F");
  pdf.setTextColor(...WHITE);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("WEEKLY REPORTING", W / 2, 9.5, { align: "center" });

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  const c2 = 100, c3 = 190;

  pdf.setFont("helvetica", "bold");   pdf.text("NAME :-",  12, 20);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.name   || "", 30, 20);
  pdf.setFont("helvetica", "bold");   pdf.text("RANK :-",  c2, 20);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.rank   || "", c2+18, 20);
  pdf.setFont("helvetica", "bold");   pdf.text("DATE (FROM)", c3, 20);
  pdf.setFont("helvetica", "normal"); pdf.text(dateFrom || "", c3+26, 20);
  pdf.setFont("helvetica", "bold");   pdf.text("TO", c3+48, 20);
  pdf.setFont("helvetica", "normal"); pdf.text(dateTo   || "", c3+54, 20);

  pdf.setFont("helvetica", "bold");   pdf.text("ID NO :-",      12, 26);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.memberId || "", 30, 26);
  pdf.setFont("helvetica", "bold");   pdf.text("MOBILE NO. :-", c2, 26);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.mobile  || "", c2+28, 26);
  pdf.setFont("helvetica", "bold");   pdf.text("NEXT LEVEL :-", c3, 26);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.nextLevel || "", c3+30, 26);

  pdf.setFont("helvetica", "bold");   pdf.text("TARGET FOR THIS WEEK CHEQUE :-", 12, 32);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.targetCheque || "", 80, 32);
  pdf.setFont("helvetica", "bold");   pdf.text("THIS WEEK CHEQUE :-", c2, 32);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.thisWeekCheque || "", c2+40, 32);
  pdf.setFont("helvetica", "bold");   pdf.text("LEFT", c3, 32);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.bonanzaLeft  || "", c3+10, 32);
  pdf.setFont("helvetica", "bold");   pdf.text("RIGHT", c3+25, 32);
  pdf.setFont("helvetica", "normal"); pdf.text(memberProfile.bonanzaRight || "", c3+37, 32);

  pdf.setDrawColor(180, 200, 230);
  pdf.setLineWidth(0.3);
  pdf.line(10, 35, W - 10, 35);

  // ── Table body ────────────────────────────────────────────────
  const days = dayData || Array(7).fill({});
  const body = [];

  days.forEach((d, i) => {
    const nd    = d.nextDays || [];
    const gnd   = (idx, f) => nd[idx]?.[f] || "";

    body.push([
      { content: i + 1,   rowSpan: 3, styles: { valign: "middle", fontStyle: "bold" } },
      { content: DAYS[i], rowSpan: 3, styles: { valign: "middle", fontStyle: "bold", halign: "left", fontSize: 6.5 } },
      { content: d.plan   || "", rowSpan: 3, styles: { valign: "middle" } },
      { content: d.follow || "", rowSpan: 3, styles: { valign: "middle" } },
      { content: d.kit    || "", rowSpan: 3, styles: { valign: "middle" } },
      { content: d.sp     || "", rowSpan: 3, styles: { valign: "middle" } },
      { content: d.nac    || "", rowSpan: 3, styles: { valign: "middle" } },
      { content: "",        rowSpan: 3, styles: { valign: "middle" } },
      { content: "",        rowSpan: 3, styles: { valign: "middle" } },
      { content: gnd(0,"mobile"), styles: { fontSize: 6 } },
      { content: gnd(1,"mobile"), styles: { fontSize: 6 } },
      { content: gnd(2,"mobile"), styles: { fontSize: 6 } },
      { content: gnd(3,"mobile"), styles: { fontSize: 6 } },
    ]);
    body.push([
      { content: gnd(0,"name"), styles: { fontStyle: "bold", fontSize: 6.5 } },
      { content: gnd(1,"name"), styles: { fontStyle: "bold", fontSize: 6.5 } },
      { content: gnd(2,"name"), styles: { fontStyle: "bold", fontSize: 6.5 } },
      { content: gnd(3,"name"), styles: { fontStyle: "bold", fontSize: 6.5 } },
    ]);
    body.push([
      { content: gnd(0,"address"), styles: { fontSize: 6 } },
      { content: gnd(1,"address"), styles: { fontSize: 6 } },
      { content: gnd(2,"address"), styles: { fontSize: 6 } },
      { content: gnd(3,"address"), styles: { fontSize: 6 } },
    ]);
  });

  const t = days.reduce(
    (a, d) => ({ plan: a.plan+(Number(d.plan)||0), follow: a.follow+(Number(d.follow)||0),
                 kit:  a.kit +(Number(d.kit) ||0), sp:     a.sp    +(Number(d.sp)   ||0),
                 nac:  a.nac +(Number(d.nac) ||0) }),
    { plan:0, follow:0, kit:0, sp:0, nac:0 }
  );
  body.push([
    { content: "",        styles: { fillColor: LIGHT } },
    { content: "TOTAL",   styles: { fontStyle: "bold", halign: "left", fillColor: LIGHT } },
    { content: t.plan,    styles: { fontStyle: "bold", fillColor: LIGHT } },
    { content: t.follow,  styles: { fontStyle: "bold", fillColor: LIGHT } },
    { content: t.kit,     styles: { fontStyle: "bold", fillColor: LIGHT } },
    { content: t.sp,      styles: { fontStyle: "bold", fillColor: LIGHT } },
    { content: t.nac,     styles: { fontStyle: "bold", fillColor: LIGHT } },
    { content: "", styles: { fillColor: LIGHT } },
    { content: "", styles: { fillColor: LIGHT } },
    { content: "", styles: { fillColor: LIGHT } },
    { content: "", styles: { fillColor: LIGHT } },
    { content: "", styles: { fillColor: LIGHT } },
    { content: "", styles: { fillColor: LIGHT } },
  ]);

  autoTable(pdf, {
    startY: 38,
    head: [
      [
        { content: "S.NO",   rowSpan: 2 },
        { content: "DAYS",   rowSpan: 2 },
        { content: "PLAN",   rowSpan: 2 },
        { content: "FOLLOW", rowSpan: 2 },
        { content: "KIT",    rowSpan: 2 },
        { content: "SP",     rowSpan: 2 },
        { content: "NAC",    rowSpan: 2 },
        { content: "BONANZA",       colSpan: 2 },
        { content: "NEXT DAY PLANNING", colSpan: 4 },
      ],
      [
        { content: "LEFT" }, { content: "RIGHT" },
        { content: "FIRST" }, { content: "SECOND" }, { content: "THIRD" }, { content: "FOURTH" },
      ],
    ],
    body,
    styles: {
      fontSize: 7,
      cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
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
      fontSize: 7.5,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    columnStyles: {
      0:  { cellWidth: 8 },
      1:  { cellWidth: 20, halign: "left" },
      9:  { cellWidth: 28 },
      10: { cellWidth: 28 },
      11: { cellWidth: 28 },
      12: { cellWidth: 28 },
    },
  });

  // ── Watermark ──────────────────────────────────────────────
  const H = pdf.internal.pageSize.height;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(150, 150, 150);
  pdf.text("Generated By MLMLIVE", W / 2, H - 5, { align: "center" });

  return pdf;
}

// ── Public helpers ────────────────────────────────────────────────────────────

/** Open PDF in a new browser tab */
export function viewPDF(opts) {
  try {
    const pdf    = buildPDF(opts);
    const blob   = pdf.output("blob");
    const url    = URL.createObjectURL(blob);
    const win    = window.open(url, "_blank");
    // If popup was blocked, fall back to same-tab navigation
    if (!win) window.location.href = url;
    // Clean up after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    
    throw e;
  }
}

/** Trigger file download of PDF */
// export function downloadPDF(opts) {
//   try {
//     const pdf      = buildPDF(opts);
//     const blob     = pdf.output("blob");
//     const url      = URL.createObjectURL(blob);
//     const filename = `Weekly-Report-${opts.memberProfile?.name || "report"}-${opts.dateFrom || ""}.pdf`;
//     const a        = document.createElement("a");
//     a.href         = url;
//     a.download     = filename;
//     a.style.display = "none";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     setTimeout(() => URL.revokeObjectURL(url), 10000);
//   } catch (e) {
//     throw e;
//   }
// }
export function downloadPDF(opts) {
  try {
    const pdf = buildPDF(opts);
    const filename = `Weekly-Report-${opts.memberProfile?.name || "report"}-${opts.dateFrom || ""}.pdf`;

    // ── React Native WebView: hand off to the native app ──
    if (typeof window !== "undefined" && window.ReactNativeWebView) {
      const dataUri = pdf.output("datauristring"); // already base64 data URI
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "DOWNLOAD_PDF",
          base64: dataUri,
          fileName: filename,
        }),
      );
      return;
    }

    // ── Normal browser download (unchanged) ──────────────
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
/** Legacy compat — kept so old call-sites don't break */
export function generateWeeklyReportPDF(opts) {
  if (opts.mode === "view")     return viewPDF(opts);
  if (opts.mode === "blob")     return buildPDF(opts).output("blob");
  downloadPDF(opts);
}
