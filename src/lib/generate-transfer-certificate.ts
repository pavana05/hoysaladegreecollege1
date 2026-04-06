import jsPDF from "jspdf";
import collegeLogo from "@/assets/college-logo.png";
import saiBabaImg from "@/assets/sai-baba.png";

interface TCData {
  fullName: string;
  fatherName: string;
  motherName: string;
  courseName: string;
  courseCode: string;
  semester: number;
  rollNumber: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  caste: string;
  category: string;
  admissionYear: number;
  academicYear: string;
  conduct: string;
  reason: string;
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export async function generateTransferCertificate(data: TCData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210, ph = 297, m = 14;
  const cx = pw / 2;

  // Border
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(1.2);
  doc.rect(m - 2, m - 2, pw - (m - 2) * 2, ph - (m - 2) * 2);
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.4);
  doc.rect(m, m, pw - m * 2, ph - m * 2);
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(0.2);
  doc.rect(m + 2, m + 2, pw - m * 2 - 4, ph - m * 2 - 4);

  // Corner ornaments
  const ornS = 8;
  const corners = [
    { x: m + 4, y: m + 4 }, { x: pw - m - 4, y: m + 4 },
    { x: m + 4, y: ph - m - 4 }, { x: pw - m - 4, y: ph - m - 4 },
  ];
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.5);
  doc.line(corners[0].x, corners[0].y, corners[0].x + ornS, corners[0].y);
  doc.line(corners[0].x, corners[0].y, corners[0].x, corners[0].y + ornS);
  doc.line(corners[1].x, corners[1].y, corners[1].x - ornS, corners[1].y);
  doc.line(corners[1].x, corners[1].y, corners[1].x, corners[1].y + ornS);
  doc.line(corners[2].x, corners[2].y, corners[2].x + ornS, corners[2].y);
  doc.line(corners[2].x, corners[2].y, corners[2].x, corners[2].y - ornS);
  doc.line(corners[3].x, corners[3].y, corners[3].x - ornS, corners[3].y);
  doc.line(corners[3].x, corners[3].y, corners[3].x, corners[3].y - ornS);

  // Header images
  try {
    const [logoImg, saiImg] = await Promise.all([loadImage(collegeLogo), loadImage(saiBabaImg)]);
    doc.addImage(logoImg, "PNG", m + 6, m + 6, 26, 26);
    doc.addImage(saiImg, "PNG", pw - m - 32, m + 6, 26, 26);
  } catch {}

  // Header text
  let y = m + 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 140);
  doc.text("Sri Shiradi Sai Educational Trust \u00AE", cx, y, { align: "center" });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(10, 10, 10);
  doc.text("HOYSALA DEGREE COLLEGE", cx, y, { align: "center" });

  const titleW = doc.getTextWidth("HOYSALA DEGREE COLLEGE");
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.6);
  doc.line(cx - titleW / 2 - 2, y + 1.5, cx + titleW / 2 + 2, y + 1.5);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text("KRP Arcade, Paramannn Layout, Nelamangala, Bangalore Rural Dist. - 562123", cx, y, { align: "center" });
  y += 3.8;
  doc.text("Affiliated to Bangalore University | College Code: BU-26 (P21GEF0099)", cx, y, { align: "center" });

  // Separator
  y += 6;
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.5);
  doc.line(m + 15, y, pw - m - 15, y);

  // Title
  y += 12;
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(10, 10, 10);
  doc.text("TRANSFER CERTIFICATE", cx, y, { align: "center" });
  const scW = doc.getTextWidth("TRANSFER CERTIFICATE");
  doc.setDrawColor(10, 10, 10);
  doc.setLineWidth(0.7);
  doc.line(cx - scW / 2, y + 2, cx + scW / 2, y + 2);
  doc.setLineWidth(0.3);
  doc.line(cx - scW / 2 + 3, y + 3.5, cx + scW / 2 - 3, y + 3.5);

  // TC number and date
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const tcNo = `HDC/TC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;
  doc.text(`No: ${tcNo}`, m + 8, y);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, pw - m - 8, y, { align: "right" });

  // TC details as numbered items
  y += 12;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  const labelX = m + 10;
  const numX = m + 10;
  const valX = m + 85;
  const lineH = 9;

  const genderPrefix = data.gender?.toLowerCase() === "male" ? "Kr" : data.gender?.toLowerCase() === "female" ? "Kum" : "Kr/Kum";
  const relation = data.gender?.toLowerCase() === "male" ? "S/O" : "D/O";

  const tcItems = [
    { label: "Name of the Student", value: `${genderPrefix}. ${data.fullName.toUpperCase()}` },
    { label: "Father's Name", value: data.fatherName || "—" },
    { label: "Mother's Name", value: data.motherName || "—" },
    { label: "Date of Birth", value: data.dateOfBirth || "—" },
    { label: "Nationality / Religion", value: data.nationality || "Indian" },
    { label: "Caste / Category", value: `${data.caste || "—"} / ${data.category || "—"}` },
    { label: "Gender", value: data.gender || "—" },
    { label: "Register Number", value: data.rollNumber },
    { label: "Course & Semester", value: `${data.courseName} (${data.courseCode}) — Sem ${data.semester}` },
    { label: "Year of Admission", value: String(data.admissionYear || "—") },
    { label: "Academic Year", value: data.academicYear || "—" },
    { label: "Conduct & Character", value: data.conduct || "Good" },
    { label: "Reason for Leaving", value: data.reason || "On completion of course" },
  ];

  for (let i = 0; i < tcItems.length; i++) {
    const item = tcItems[i];
    doc.setFont("times", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(`${i + 1}.`, numX, y);
    doc.text(item.label, numX + 6, y);
    doc.setFont("times", "bold");
    doc.text(`:  ${item.value}`, valX, y);
    
    doc.setDrawColor(220, 210, 190);
    doc.setLineWidth(0.1);
    doc.line(valX, y + 1.5, pw - m - 10, y + 1.5);
    y += lineH;
  }

  // Disclaimer
  y += 8;
  doc.setDrawColor(200, 180, 120);
  doc.setLineWidth(0.2);
  doc.line(m + 10, y - 4, pw - m - 10, y - 4);

  doc.setFont("times", "bolditalic");
  doc.setFontSize(10);
  doc.setTextColor(160, 20, 20);
  doc.text("Certified that the above particulars are correct as per the college records.", cx, y, { align: "center" });

  // Signatures
  const sigY = ph - m - 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Place: Nelamangala", m + 8, sigY);
  doc.text(`Date: _______________`, m + 8, sigY + 6);

  // College seal placeholder
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.4);
  doc.circle(cx, sigY - 2, 14);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140, 100, 40);
  doc.text("College Seal", cx, sigY - 2, { align: "center" });

  // Principal
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.3);
  doc.line(pw - m - 55, sigY + 2, pw - m - 10, sigY + 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("Principal", pw - m - 32, sigY + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text("Hoysala Degree College", pw - m - 32, sigY + 13, { align: "center" });

  // Footer
  const footerY = ph - m - 4;
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(0.3);
  doc.line(m + 4, footerY - 3, pw - m - 4, footerY - 3);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text("This is a computer-generated Transfer Certificate. For verification, contact the college office.", cx, footerY, { align: "center" });

  doc.save(`TC_${data.fullName.replace(/\s+/g, "_")}.pdf`);
}
