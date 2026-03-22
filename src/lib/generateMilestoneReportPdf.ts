import jsPDF from "jspdf";

interface GroupedResult {
  categoryName: string;
  categoryCode: string;
  items: {
    subcategoryCode: string;
    subcategoryName: string;
    milestoneLevel: number;
    comment: string;
    feedbackCount: number;
    positiveCount: number;
    negativeCount: number;
  }[];
}

export function generateReportPdf({
  residentName,
  facultyName,
  dateStart,
  dateEnd,
  groupedResults,
}: {
  residentName: string;
  facultyName: string;
  dateStart: string;
  dateEnd: string;
  groupedResults: GroupedResult[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = 50;

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 50;
    }
  };

  // Strip HTML tags for plain text comment
  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Milestone Assessment Report", margin, y);
  y += 28;

  // Subtitle info
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Resident: ${residentName}`, margin, y);
  y += 16;
  doc.text(`Faculty: ${facultyName}`, margin, y);
  y += 16;
  doc.text(`Period: ${dateStart} – ${dateEnd}`, margin, y);
  y += 16;
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`,
    margin,
    y
  );
  y += 28;

  // Separator line
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Reset text color
  doc.setTextColor(0);

  // Loop through categories
  groupedResults.forEach((group) => {
    checkPageBreak(40);

    // Category header
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text(group.categoryName.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(210);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    group.items.forEach((item) => {
      checkPageBreak(100);

      // Sub-competency name
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(`${item.subcategoryCode}: ${item.subcategoryName}`, margin, y);
      y += 16;

      // Milestone level
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Milestone Level: ${item.milestoneLevel} / 5`, margin + 10, y);
      y += 14;

      // Observation counts
      doc.text(
        `Observations: ${item.feedbackCount} (${item.positiveCount} positive, ${item.negativeCount} negative)`,
        margin + 10,
        y
      );
      y += 18;

      // Comment
      doc.setTextColor(0);
      doc.setFontSize(10);
      const plainComment = stripHtml(item.comment);
      const commentLines = doc.splitTextToSize(plainComment, contentWidth - 20);
      checkPageBreak(commentLines.length * 14 + 10);
      doc.text(commentLines, margin + 10, y);
      y += commentLines.length * 14 + 20;
    });

    y += 10;
  });

  return doc;
}
