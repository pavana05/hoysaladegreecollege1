import jsPDF from "jspdf";
import { formatAadhaar } from "@/lib/format-aadhaar";
import collegeLogo from "@/assets/college-logo.png";
import saiBabaImg from "@/assets/sai-baba.png";

interface StudentData {
  fullName: string;
  fatherName: string;
  courseName: string;
  semester: number;
  rollNumber: string;
  gender: string;
  aadhaarNumber: string;
  dateOfBirth: string;
  nationality: string;
  caste: string;
  category: string;
  academicYear: string;
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

export async function generateStudyCertificate(data: StudentData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210; // page width
  const ph = 297; // page height
  const m = 12;   // margin
  const cw = pw - m * 2; // content width
  const cx = pw / 2; // center x

  // ── Elegant double border with gold-toned accent ──
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(1.2);
  doc.rect(m - 2, m - 2, pw - (m - 2) * 2, ph - (m - 2) * 2);

  doc.setDrawColor(140, 100, 40); // gold accent
  doc.setLineWidth(0.4);
  doc.rect(m, m, cw, ph - m * 2);

  // Inner decorative border
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(0.2);
  doc.rect(m + 2, m + 2, cw - 4, ph - m * 2 - 4);

  // Corner ornaments (small L-brackets)
  const ornamentSize = 8;
  const corners = [
    { x: m + 4, y: m + 4 },
    { x: pw - m - 4, y: m + 4 },
    { x: m + 4, y: ph - m - 4 },
    { x: pw - m - 4, y: ph - m - 4 },
  ];
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.5);
  // Top-left
  doc.line(corners[0].x, corners[0].y, corners[0].x + ornamentSize, corners[0].y);
  doc.line(corners[0].x, corners[0].y, corners[0].x, corners[0].y + ornamentSize);
  // Top-right
  doc.line(corners[1].x, corners[1].y, corners[1].x - ornamentSize, corners[1].y);
  doc.line(corners[1].x, corners[1].y, corners[1].x, corners[1].y + ornamentSize);
  // Bottom-left
  doc.line(corners[2].x, corners[2].y, corners[2].x + ornamentSize, corners[2].y);
  doc.line(corners[2].x, corners[2].y, corners[2].x, corners[2].y - ornamentSize);
  // Bottom-right
  doc.line(corners[3].x, corners[3].y, corners[3].x - ornamentSize, corners[3].y);
  doc.line(corners[3].x, corners[3].y, corners[3].x, corners[3].y - ornamentSize);

  // ── Header Images ──
  try {
    const [logoImg, saiImg] = await Promise.all([
      loadImage(collegeLogo),
      loadImage(saiBabaImg),
    ]);
    // College logo - left side, properly sized and centered vertically in header
    doc.addImage(logoImg, "PNG", m + 6, m + 6, 26, 26);
    // Sai Baba image - right side, maintain aspect ratio (not stretched)
    const saiW = 22;
    const saiH = 26;
    doc.addImage(saiImg, "PNG", pw - m - 28, m + 6, saiW, saiH);
  } catch (e) {
    console.warn("Could not load images for certificate:", e);
  }

  // ── Header Text ──
  let y = m + 10;

  // Trust name
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 140);
  doc.text("Sri Shiradi Sai Educational Trust \u00AE", cx, y, { align: "center" });

  // College name
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(10, 10, 10);
  doc.text("HOYSALA DEGREE COLLEGE", cx, y, { align: "center" });

  // Decorative underline under college name
  const titleW = doc.getTextWidth("HOYSALA DEGREE COLLEGE");
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.6);
  doc.line(cx - titleW / 2 - 2, y + 1.5, cx + titleW / 2 + 2, y + 1.5);
  doc.setLineWidth(0.2);
  doc.line(cx - titleW / 2 + 5, y + 3, cx + titleW / 2 - 5, y + 3);

  // Address
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text("KRP Arcade, Paramannn Layout, Nelamangala, Bangalore Rural Dist. - 562123", cx, y, { align: "center" });

  y += 3.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Recognized by Govt. of Karnataka", cx, y, { align: "center" });

  y += 3.8;
  doc.text("Affiliated to Bangalore University & Approved By AICTE, New Delhi", cx, y, { align: "center" });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text("College Code: BU - 26 (P21GEF0099)", cx, y, { align: "center" });

  // ── Elegant separator ──
  y += 5;
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.5);
  doc.line(m + 15, y, pw - m - 15, y);
  doc.setDrawColor(200, 170, 100);
  doc.setLineWidth(0.2);
  doc.line(m + 25, y + 1.2, pw - m - 25, y + 1.2);

  // ── STUDY CERTIFICATE Title ──
  y += 14;
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(10, 10, 10);
  doc.text("STUDY CERTIFICATE", cx, y, { align: "center" });

  // Double underline for title
  const scW = doc.getTextWidth("STUDY CERTIFICATE");
  doc.setDrawColor(10, 10, 10);
  doc.setLineWidth(0.7);
  doc.line(cx - scW / 2, y + 2, cx + scW / 2, y + 2);
  doc.setLineWidth(0.3);
  doc.line(cx - scW / 2 + 3, y + 3.5, cx + scW / 2 - 3, y + 3.5);

  // ── Spacing after title ──
  y += 10;

  // ── Body Text ──
  const genderPrefix = data.gender?.toLowerCase() === "male" ? "Kr" :
                        data.gender?.toLowerCase() === "female" ? "Kum" : "Kr/Kum";
  const relation = data.gender?.toLowerCase() === "male" ? "S/O" : "D/O";

  y += 14;
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(15, 15, 15);

  const bodyText = `This is to certify that ${genderPrefix}. ${data.fullName.toUpperCase()} ${relation} ${data.fatherName || "________"} is a student of HOYSALA DEGREE COLLEGE in ${data.courseName || "________"} ${data.semester ? `Sem ${data.semester}` : "________"} bearing Admission No: (Reg.No: ${data.rollNumber || "________"}) during the academic year ${data.academicYear}.`;

  const bodyLines = doc.splitTextToSize(bodyText, cw - 20);
  doc.text(bodyLines, m + 10, y, { lineHeightFactor: 2.0 });

  // ── Student Details Section ──
  y += bodyLines.length * 10 + 16;

  // Section divider
  doc.setDrawColor(200, 180, 120);
  doc.setLineWidth(0.2);
  doc.line(m + 10, y - 4, pw - m - 10, y - 4);

  const details = [
    { label: "Aadhar No", value: formatAadhaar(data.aadhaarNumber) !== "-" ? formatAadhaar(data.aadhaarNumber) : "________________" },
    { label: "Date of Birth", value: data.dateOfBirth || "________________" },
    { label: "Nationality", value: data.nationality || "________________" },
    { label: "Caste", value: data.caste || "________________" },
    { label: "Group", value: data.category || "________________" },
  ];

  doc.setFontSize(11.5);
  for (const d of details) {
    doc.setFont("times", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`${d.label}:`, m + 10, y);
    doc.setFont("times", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(d.value, m + 48, y);

    // Subtle underline under value
    doc.setDrawColor(220, 210, 190);
    doc.setLineWidth(0.15);
    doc.line(m + 48, y + 1, m + 120, y + 1);

    y += 8.5;
  }

  // ── Disclaimer ──
  y += 8;
  doc.setDrawColor(200, 180, 120);
  doc.setLineWidth(0.2);
  doc.line(m + 10, y - 4, pw - m - 10, y - 4);

  doc.setFont("times", "bolditalic");
  doc.setFontSize(10.5);
  doc.setTextColor(160, 20, 20);
  doc.text("This Certificate is issued according to the records of our Institution.", cx, y, { align: "center" });

  // ── College Seal Space ──
  const sealY = y + 6;
  doc.setDrawColor(140, 100, 40);
  doc.setLineWidth(0.4);
  doc.circle(cx, sealY + 12, 14);
  doc.setLineWidth(0.2);
  doc.circle(cx, sealY + 12, 12);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140, 100, 40);
  doc.text("College Seal", cx, sealY + 12, { align: "center" });

  // ── Signature Section ──
  const sigY = ph - m - 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Date: _______________`, m + 8, sigY + 6);

  // Principal signature block - right aligned
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
  doc.text("Nelamangala", pw - m - 32, sigY + 17, { align: "center" });

  // ── Footer ──
  const footerY = ph - m - 4;
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(0.3);
  doc.line(m + 4, footerY - 3, pw - m - 4, footerY - 3);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text("This is a computer-generated certificate. For verification, please contact the college office.", cx, footerY, { align: "center" });

  // Save
  doc.save(`Study_Certificate_${data.fullName.replace(/\s+/g, "_")}.pdf`);
}
