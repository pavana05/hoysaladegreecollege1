import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  IndianRupee,
  Calendar,
  User,
  BookOpen,
  Receipt,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  Layers,
  CreditCard,
  TrendingUp,
  Plus,
  Printer,
  Bell,
  FileText,
  Send,
  Download,
  MessageCircle,
  Sparkles,
  Clock,
  Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const CHART_COLORS = [
  "hsl(142, 70%, 45%)",
  "hsl(0, 84%, 60%)",
  "hsl(42, 87%, 55%)",
  "hsl(217, 72%, 55%)",
  "hsl(280, 60%, 55%)",
];

export default function AdminStudentFeeDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const [payForm, setPayForm] = useState({
    amount: "",
    payment_method: "Cash",
    remarks: "",
    upi_number: "",
    semester: "",
  });
  const [editForm, setEditForm] = useState({ total_fee: "", fee_due_date: "", fee_remarks: "" });
  const [semesterFees, setSemesterFees] = useState<Record<number, string>>({});
  const [editMode, setEditMode] = useState<"total" | "semester">("total");
  const [reminderMsg, setReminderMsg] = useState("");

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ["fee-student-detail", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*, courses(name, code)").eq("id", studentId!).single();
      if (!data) return null;
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", data.user_id).single();
      return { ...data, profile: prof };
    },
    enabled: !!studentId,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["fee-student-payments", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: existingSemFees = [] } = useQuery({
    queryKey: ["semester-fees", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("semester_fees")
        .select("*")
        .eq("student_id", studentId!)
        .order("semester", { ascending: true });
      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: concessions = [] } = useQuery({
    queryKey: ["student-concessions", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fee_concessions")
        .select("*")
        .eq("student_id", studentId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!studentId,
  });

  // ─── Mutations ─────────────────────────────────────────────
  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!student || !payForm.amount) throw new Error("Fill amount");
      const amount = parseFloat(payForm.amount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      const newPaid = (student.fee_paid || 0) + amount;
      const receipt_number = `RCP-${Date.now().toString().slice(-6)}`;
      const upiInfo =
        (payForm.payment_method === "Online" || payForm.payment_method === "UPI") && payForm.upi_number
          ? `[UPI: ${payForm.upi_number}] `
          : "";
      const remarks = `${upiInfo}${payForm.remarks || ""}`.trim();
      const paymentSemester = payForm.semester ? parseInt(payForm.semester) : student.semester || 1;

      await supabase.from("fee_payments").insert({
        student_id: student.id,
        amount,
        payment_method: payForm.payment_method,
        remarks,
        receipt_number,
        recorded_by: user?.id,
        semester: paymentSemester,
      });
      await supabase.from("students").update({ fee_paid: newPaid }).eq("id", student.id);

      // Overpayment carry-forward logic
      const { data: semFeesData } = await supabase
        .from("semester_fees")
        .select("semester, fee_amount")
        .eq("student_id", student.id)
        .order("semester");
      const { data: allSemPayments } = await supabase
        .from("fee_payments")
        .select("semester, amount")
        .eq("student_id", student.id);

      if (semFeesData && semFeesData.length > 0 && allSemPayments) {
        const semPaidMap: Record<number, number> = {};
        allSemPayments.forEach((p: any) => {
          const s = p.semester || 0;
          semPaidMap[s] = (semPaidMap[s] || 0) + Number(p.amount);
        });

        const semFee = semFeesData.find((sf: any) => sf.semester === paymentSemester);
        if (semFee) {
          const semFeeAmount = Number(semFee.fee_amount);
          const totalSemPaid = semPaidMap[paymentSemester] || 0;
          const excess = totalSemPaid - semFeeAmount;

          if (excess > 0) {
            // Find next semester that has unpaid balance
            const nextSem = semFeesData.find((sf: any) => {
              if (sf.semester <= paymentSemester) return false;
              const nextPaid = semPaidMap[sf.semester] || 0;
              return nextPaid < Number(sf.fee_amount);
            });

            if (nextSem) {
              await supabase.from("fee_payments").insert({
                student_id: student.id,
                amount: excess,
                payment_method: payForm.payment_method,
                remarks: `Auto carry-forward from Semester ${paymentSemester}`,
                receipt_number: `CF-${Date.now().toString().slice(-6)}`,
                recorded_by: user?.id,
                semester: nextSem.semester,
              });
            }
          }
        }
      }

      const studentEmail = student.profile?.email;
      if (studentEmail) {
        try {
          await supabase.functions.invoke("send-fee-receipt", {
            body: {
              studentEmail,
              studentName: student.profile?.full_name || "",
              receiptNumber: receipt_number,
              amount,
              paymentMethod: payForm.payment_method,
              courseName: student.courses?.name || "",
              rollNumber: student.roll_number || "",
              remarks,
              date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            },
          });
        } catch (e) {
          console.error("Email failed:", e);
        }
      }
      return {
        receipt_number,
        amount,
        payment_method: payForm.payment_method,
        remarks,
        semester: payForm.semester || String(student.semester || 1),
      };
    },
    onSuccess: (data) => {
      toast.success("Payment recorded & receipt emailed!");
      qc.invalidateQueries({ queryKey: ["fee-student-detail"] });
      qc.invalidateQueries({ queryKey: ["fee-student-payments"] });
      qc.invalidateQueries({ queryKey: ["fee-students"] });
      qc.invalidateQueries({ queryKey: ["all-fee-payments"] });
      setLastReceipt(data);
      setShowPayModal(false);
      setShowReceipt(true);
      setPayForm({ amount: "", payment_method: "Cash", remarks: "", upi_number: "", semester: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateFee = useMutation({
    mutationFn: async () => {
      if (!student) return;
      if (editMode === "semester") {
        const entries = Object.entries(semesterFees).filter(([_, v]) => v && parseFloat(v) > 0);
        for (const [sem, amount] of entries) {
          await supabase.from("semester_fees").upsert(
            {
              student_id: student.id,
              semester: parseInt(sem),
              fee_amount: parseFloat(amount) || 0,
              due_date: editForm.fee_due_date || null,
              remarks: editForm.fee_remarks || "",
              updated_by: user?.id,
            },
            { onConflict: "student_id,semester" },
          );
        }
        const { data: allSemFees } = await supabase
          .from("semester_fees")
          .select("fee_amount")
          .eq("student_id", student.id);
        const totalFromSemesters = (allSemFees || []).reduce((sum: number, f: any) => sum + Number(f.fee_amount), 0);
        await supabase
          .from("students")
          .update({
            total_fee: totalFromSemesters,
            fee_due_date: editForm.fee_due_date || null,
            fee_remarks: editForm.fee_remarks || "",
          })
          .eq("id", student.id);
      } else {
        await supabase
          .from("students")
          .update({
            total_fee: parseFloat(editForm.total_fee) || 0,
            fee_due_date: editForm.fee_due_date || null,
            fee_remarks: editForm.fee_remarks || "",
          })
          .eq("id", student.id);
      }
    },
    onSuccess: () => {
      toast.success("Fee details updated!");
      qc.invalidateQueries({ queryKey: ["fee-student-detail"] });
      qc.invalidateQueries({ queryKey: ["fee-students"] });
      qc.invalidateQueries({ queryKey: ["semester-fees"] });
      setShowEditModal(false);
    },
    onError: () => toast.error("Failed to update"),
  });

  const sendReminder = useMutation({
    mutationFn: async () => {
      if (!student) return;
      const curSem = student.semester || 1;
      const curSemFeeObj = existingSemFees.find((sf: any) => sf.semester === curSem);
      const curSemFeeAmount = curSemFeeObj ? Number(curSemFeeObj.fee_amount) : (student.total_fee || 0) / 6;
      const curSemPaid = payments
        .filter((p: any) => p.semester === curSem)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const curSemBalance = Math.max(0, curSemFeeAmount - curSemPaid);
      const msg =
        reminderMsg ||
        `Dear ${student.profile?.full_name}, you have a pending fee of ₹${curSemBalance.toLocaleString()} for Semester ${curSem}. Please clear your dues at the earliest. - Hoysala Degree College`;
      await supabase.from("notifications").insert({
        user_id: student.user_id,
        title: "⚠️ Important: Fee Payment Reminder",
        message: msg,
        type: "fee_reminder",
        link: "/dashboard/student/fees",
      });
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            notifications: [
              {
                user_id: student.user_id,
                title: "⚠️ Fee Payment Reminder",
                body: msg,
                url: "/dashboard/student/fees",
                tag: `hdc-fee-reminder-${Date.now()}`,
              },
            ],
          },
        });
      } catch (pushErr) {
        console.error("Push failed:", pushErr);
      }
      const studentEmail = student.profile?.email;
      if (studentEmail) {
        try {
          await supabase.functions.invoke("send-fee-reminder", {
            body: {
              studentEmail,
              studentName: student.profile?.full_name || "",
              rollNumber: student.roll_number || "",
              courseName: student.courses?.name || "",
              dueAmount: curSemBalance,
              dueDate: student.fee_due_date
                ? new Date(student.fee_due_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null,
              message: msg,
            },
          });
        } catch (emailErr) {
          console.error("Email failed:", emailErr);
        }
      }
    },
    onSuccess: () => {
      toast.success("Reminder sent (in-app + push + email)!");
      setReminderMsg("");
      setShowReminderModal(false);
    },
    onError: () => toast.error("Failed to send reminder"),
  });

  // ─── Print Report ──────────────────────────────────────────
  const printReport = () => {
    if (!student) return;
    const due = Math.max(0, (student.total_fee || 0) - (student.fee_paid || 0));
    const pctVal =
      (student.total_fee || 0) > 0 ? Math.round(((student.fee_paid || 0) / (student.total_fee || 0)) * 100) : 0;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const paymentRows = payments
      .map(
        (p: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;font-family:monospace;color:#4f46e5">${p.receipt_number || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px">${format(new Date(p.created_at), "dd MMM yyyy, hh:mm a")}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px">${p.semester ? `Sem ${p.semester}` : "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px">${p.payment_method || "Cash"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;font-weight:bold;color:#16a34a">₹${Number(p.amount).toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;color:#666">${p.remarks || "—"}</td>
      </tr>
    `,
      )
      .join("");
    w.document.write(`
      <html><head><title>Fee Report - ${student.profile?.full_name}</title>
      <style>body{font-family:'Segoe UI',sans-serif;padding:30px;max-width:780px;margin:0 auto;color:#222}h1{text-align:center;font-size:22px;margin-bottom:2px}.sub{text-align:center;font-size:13px;color:#666;margin-bottom:24px}.section{margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px}.section h2{font-size:14px;color:#4f46e5;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:1px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.grid-item{padding:8px;background:#f9fafb;border-radius:8px}.grid-item .label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px}.grid-item .value{font-size:13px;font-weight:600}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.stat{text-align:center;padding:12px;background:#f0fdf4;border-radius:10px;border:1px solid #d1fae5}.stat.due{background:#fef2f2;border-color:#fecaca}.stat .val{font-size:18px;font-weight:bold}.stat .lbl{font-size:10px;color:#666;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;padding:10px 8px;background:#f3f4f6;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:0.5px}.footer{text-align:center;font-size:10px;color:#999;margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb}@media print{button{display:none!important}.no-print{display:none!important}}</style></head><body>
      <h1>Hoysala Degree College</h1>
      <p class="sub">Student Fee Report · Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
      <div class="section"><h2>Student Information</h2><div class="grid">
        <div class="grid-item"><div class="label">Name</div><div class="value">${student.profile?.full_name || "—"}</div></div>
        <div class="grid-item"><div class="label">Roll No</div><div class="value">${student.roll_number}</div></div>
        <div class="grid-item"><div class="label">Course</div><div class="value">${student.courses?.name || "—"} (${student.courses?.code || ""})</div></div>
        <div class="grid-item"><div class="label">Semester</div><div class="value">${student.semester || 1}</div></div>
        <div class="grid-item"><div class="label">Email</div><div class="value">${student.profile?.email || "—"}</div></div>
        <div class="grid-item"><div class="label">Phone</div><div class="value">${student.profile?.phone || student.phone || "—"}</div></div>
      </div></div>
      <div class="stats">
        <div class="stat"><div class="val">₹${(student.total_fee || 0).toLocaleString()}</div><div class="lbl">Yearly Fee</div></div>
        <div class="stat"><div class="val" style="color:#16a34a">₹${(student.fee_paid || 0).toLocaleString()}</div><div class="lbl">Total Paid</div></div>
        <div class="stat ${due > 0 ? "due" : ""}"><div class="val" style="color:${due > 0 ? "#dc2626" : "#16a34a"}">₹${due.toLocaleString()}</div><div class="lbl">Balance Due</div></div>
        <div class="stat"><div class="val">${pctVal}%</div><div class="lbl">Collection</div></div>
      </div>
      <div class="section"><h2>Payment History (${payments.length} transactions)</h2>
      ${payments.length === 0 ? '<p style="text-align:center;color:#999;padding:20px">No payments recorded yet.</p>' : `<table><thead><tr><th>Receipt</th><th>Date</th><th>Semester</th><th>Method</th><th style="text-align:right">Amount</th><th>Remarks</th></tr></thead><tbody>${paymentRows}</tbody></table>`}
      </div>
      <div class="footer"><p>Computer-generated report · Hoysala Degree College Fee Management System</p><p>Report ID: RPT-${Date.now().toString().slice(-8)}</p></div>
      <div style="text-align:center;margin-top:16px" class="no-print"><button onclick="window.print()" style="padding:10px 32px;cursor:pointer;border:1px solid #ccc;border-radius:10px;background:#f5f5f5;font-size:14px">🖨️ Print Report</button></div>
      </body></html>`);
    w.document.close();
  };

  const exportStudentCSV = () => {
    if (!student || payments.length === 0) {
      toast.info("No payments to export");
      return;
    }
    const header = "Receipt,Date,Semester,Method,Amount,Remarks";
    const rows = payments.map((p: any) =>
      [
        p.receipt_number || "",
        format(new Date(p.created_at), "dd MMM yyyy"),
        p.semester || "",
        p.payment_method || "Cash",
        p.amount,
        p.remarks || "",
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fee_report_${student.roll_number}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV exported!");
  };

  // ─── Loading ───────────────────────────────────────────────
  if (studentLoading || paymentsLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            <User className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <p className="font-body text-sm text-muted-foreground">Student not found.</p>
          <Link
            to="/dashboard/admin/fees"
            className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Fee Management
          </Link>
        </div>
      </div>
    );
  }

  const totalFee = student.total_fee || 0;
  const feePaid = student.fee_paid || 0;
  const totalDue = Math.max(0, totalFee - feePaid);
  const pct = totalFee > 0 ? Math.round((feePaid / totalFee) * 100) : 0;
  const currentSemester = student.semester || 1;
  const isOverdue = totalDue > 0 && student.fee_due_date && new Date(student.fee_due_date) < new Date();
  const perSemFee = totalFee > 0 ? Math.round(totalFee / 6) : 0;

  const semPayments: Record<number, number> = {};
  payments.forEach((p: any) => {
    const sem = p.semester || 0;
    semPayments[sem] = (semPayments[sem] || 0) + Number(p.amount);
  });
  const semChartData = [1, 2, 3, 4, 5, 6].map((s) => ({
    name: `Sem ${s}`,
    paid: semPayments[s] || 0,
    due: Math.max(0, perSemFee - (semPayments[s] || 0)),
  }));

  const methodBreakdown: Record<string, number> = {};
  payments.forEach((p: any) => {
    const m = p.payment_method || "Cash";
    methodBreakdown[m] = (methodBreakdown[m] || 0) + Number(p.amount);
  });
  const methodChartData = Object.entries(methodBreakdown).map(([name, value]) => ({ name, value }));

  // Payment timeline for area chart
  const paymentTimeline = (() => {
    const months: Record<string, number> = {};
    payments.forEach((p: any) => {
      const m = format(new Date(p.created_at), "MMM yy");
      months[m] = (months[m] || 0) + Number(p.amount);
    });
    return Object.entries(months)
      .reverse()
      .slice(0, 12)
      .reverse()
      .map(([month, amount]) => ({ month, amount }));
  })();

  const inputClass =
    "w-full border border-border/60 rounded-xl px-3.5 py-2.5 font-body text-sm bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-muted/50 transition-all duration-300 placeholder:text-muted-foreground/50";

  const chartTooltipStyle = {
    contentStyle: {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "12px",
      fontSize: "12px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    },
    labelStyle: { fontWeight: 600, marginBottom: "4px" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Premium Header ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-[hsl(var(--gold))]/[0.03] blur-[80px] pointer-events-none" />
        {/* Top gold accent */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/20 to-transparent" />

        <div className="relative p-6 md:p-8">
          <div className="flex items-start gap-4 flex-wrap">
            <Link
              to="/dashboard/admin/fees"
              className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 border border-border/50 transition-all duration-200 shrink-0 mt-1 group"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="font-body text-[10px] font-bold uppercase tracking-widest text-primary">
                  Student Fee Report
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">
                {student.profile?.full_name || "—"}
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                {student.roll_number} · {student.courses?.name || "—"} ({student.courses?.code || ""}) · Semester{" "}
                {currentSemester}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-2xl text-xs font-bold border ${isOverdue ? "bg-destructive/10 text-destructive border-destructive/20" : totalDue > 0 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}
            >
              {isOverdue ? "⚠ Overdue" : totalDue > 0 ? "● Pending" : "✓ Cleared"}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative flex flex-wrap gap-2 mt-6 pt-5 border-t border-border/40">
            <Button
              size="sm"
              onClick={() => {
                setShowPayModal(true);
                setPayForm((f) => ({ ...f, semester: String(currentSemester) }));
              }}
              className="gap-1.5 text-xs rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:shadow-[0_4px_20px_hsl(var(--primary)/0.3)] transition-all duration-300"
            >
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowEditModal(true);
                setEditForm({
                  total_fee: String(student.total_fee || ""),
                  fee_due_date: student.fee_due_date || "",
                  fee_remarks: student.fee_remarks || "",
                });
                setEditMode("total");
                const semMap: Record<number, string> = {};
                existingSemFees.forEach((sf: any) => {
                  semMap[sf.semester] = String(sf.fee_amount);
                });
                setSemesterFees(semMap);
              }}
              className="gap-1.5 text-xs rounded-xl border-border/60 hover:bg-muted/50"
            >
              <FileText className="w-3.5 h-3.5" /> Edit Fee
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const cs = student.semester || 1;
                const csFeeObj = existingSemFees.find((sf: any) => sf.semester === cs);
                const csFee = csFeeObj ? Number(csFeeObj.fee_amount) : perSemFee;
                const csPaid = semPayments[cs] || 0;
                const csBal = Math.max(0, csFee - csPaid);
                setShowReminderModal(true);
                setReminderMsg(
                  `Dear ${student.profile?.full_name}, you have a pending fee of ₹${csBal.toLocaleString()} for Semester ${cs}. Please clear your dues at the earliest. - Hoysala Degree College`,
                );
              }}
              className="gap-1.5 text-xs rounded-xl border-border/60 hover:bg-muted/50"
            >
              <Bell className="w-3.5 h-3.5" /> Remind
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={printReport}
              className="gap-1.5 text-xs rounded-xl border-border/60 hover:bg-muted/50"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportStudentCSV}
              className="gap-1.5 text-xs rounded-xl border-border/60 hover:bg-muted/50"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs rounded-xl border-border/60 hover:bg-muted/50"
              asChild
            >
              {(() => {
                const currentSemFeeObj = existingSemFees.find((sf: any) => sf.semester === currentSemester);
                const currentSemFeeAmount = currentSemFeeObj ? Number(currentSemFeeObj.fee_amount) : perSemFee;
                const currentSemPaid = semPayments[currentSemester] || 0;
                const currentSemBalance = Math.max(0, currentSemFeeAmount - currentSemPaid);
                return (
                  <a
                    href={`https://wa.me/${(student.parent_phone || student.phone || student.profile?.phone || "").replace(/\D/g, "").replace(/^0/, "91")}?text=${encodeURIComponent(`Dear ${student.profile?.full_name || "Student"},\n\nThis is a reminder from Hoysala Degree College regarding your pending fee \n\n Remaining fees = *₹${currentSemBalance.toLocaleString()}* for Semester ${currentSemester}.\n\nPlease clear your dues at the earliest.\n\nRoll No: ${student.roll_number}\nCourse: ${student.courses?.name || ""}\nSemester: ${currentSemester}\n${student.fee_due_date ? `Due Date: ${new Date(student.fee_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}\n\nThank you,\nHoysala Degree College`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                );
              })()}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Personal Info ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-6">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          Personal Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Mail, label: "Email", value: student.profile?.email },
            { icon: Phone, label: "Phone", value: student.profile?.phone || student.phone },
            { icon: Phone, label: "Parent Phone", value: student.parent_phone },
            { icon: User, label: "Father", value: student.father_name },
            { icon: User, label: "Mother", value: student.mother_name },
            { icon: MapPin, label: "Address", value: student.address },
            {
              icon: Calendar,
              label: "Date of Birth",
              value: student.date_of_birth ? format(new Date(student.date_of_birth), "dd MMM yyyy") : null,
            },
            { icon: BookOpen, label: "Admission Year", value: student.admission_year },
            { icon: Layers, label: "Year Level", value: student.year_level ? `Year ${student.year_level}` : null },
          ].map(({ icon: Icon, label, value }) =>
            value ? (
              <div
                key={label}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="font-body text-sm font-medium text-foreground mt-0.5">{value}</p>
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>

      {/* ─── Premium Stat Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "YEARLY FEE",
            value: `₹${totalFee.toLocaleString()}`,
            icon: IndianRupee,
            gradient: "from-primary/15 to-primary/5",
            iconBg: "bg-primary/15",
            iconColor: "text-primary",
            valueColor: "text-foreground",
          },
          {
            label: "COLLECTED",
            value: `₹${feePaid.toLocaleString()}`,
            icon: CheckCircle,
            gradient: "from-emerald-500/15 to-emerald-500/5",
            iconBg: "bg-emerald-500/15",
            iconColor: "text-emerald-500",
            valueColor: "text-emerald-500",
          },
          {
            label: "PENDING",
            value: `₹${totalDue.toLocaleString()}`,
            icon: AlertCircle,
            gradient: totalDue > 0 ? "from-destructive/15 to-destructive/5" : "from-emerald-500/15 to-emerald-500/5",
            iconBg: totalDue > 0 ? "bg-destructive/15" : "bg-emerald-500/15",
            iconColor: totalDue > 0 ? "text-destructive" : "text-emerald-500",
            valueColor: totalDue > 0 ? "text-destructive" : "text-emerald-500",
          },
          {
            label: "COLLECTION",
            value: `${pct}%`,
            icon: TrendingUp,
            gradient:
              pct >= 80
                ? "from-emerald-500/15 to-emerald-500/5"
                : pct >= 50
                  ? "from-amber-500/15 to-amber-500/5"
                  : "from-destructive/15 to-destructive/5",
            iconBg: pct >= 80 ? "bg-emerald-500/15" : pct >= 50 ? "bg-amber-500/15" : "bg-destructive/15",
            iconColor: pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-destructive",
            valueColor: pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-destructive",
          },
        ].map(({ label, value, icon: Icon, gradient, iconBg, iconColor, valueColor }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-5 hover:border-border transition-all duration-300 hover:shadow-lg"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
            />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <p className={`font-display text-xl font-bold ${valueColor} tabular-nums`}>{value}</p>
              <p className="font-body text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Payment Progress ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-6">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent" />
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </div>
          Payment Progress
        </h3>
        <div className="relative h-5 bg-muted/50 rounded-full overflow-hidden border border-border/30">
          <div className="absolute inset-0 bg-gradient-to-r from-muted/20 to-transparent" />
          <div
            className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
            style={{
              width: `${pct}%`,
              background:
                pct === 100
                  ? "linear-gradient(90deg, hsl(142 70% 40%), hsl(142 70% 50%))"
                  : pct > 50
                    ? "linear-gradient(90deg, hsl(42 87% 45%), hsl(42 87% 55%))"
                    : "linear-gradient(90deg, hsl(0 84% 50%), hsl(0 84% 60%))",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
          </div>
        </div>
        <div className="flex justify-between mt-3">
          <span className="font-body text-xs text-muted-foreground">₹{feePaid.toLocaleString()} paid</span>
          <span className="font-display text-sm font-bold text-foreground">{pct}%</span>
          <span className="font-body text-xs text-muted-foreground">₹{totalFee.toLocaleString()} total</span>
        </div>
        {student.fee_due_date && (
          <div
            className={`mt-4 flex items-center gap-2 text-xs font-body px-3 py-2 rounded-xl ${isOverdue ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted/30 text-muted-foreground border border-border/30"}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Due Date: <strong>{format(new Date(student.fee_due_date), "dd MMM yyyy")}</strong>
            {isOverdue && <span className="ml-1 font-bold">— OVERDUE</span>}
          </div>
        )}
        {student.fee_remarks && (
          <p className="font-body text-xs text-muted-foreground mt-3 italic bg-muted/20 rounded-xl px-3 py-2 border border-border/20">
            💬 {student.fee_remarks}
          </p>
        )}
      </div>

      {/* ─── Semester Breakdown ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-6">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
        <h3 className="font-display text-sm font-bold text-foreground mb-5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-primary" />
          </div>
          Semester-wise Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6].map((s) => {
            const paid = semPayments[s] || 0;
            const due = Math.max(0, perSemFee - paid);
            const semPct = perSemFee > 0 ? Math.round((paid / perSemFee) * 100) : 0;
            const isCurrent = s === currentSemester;
            return (
              <div
                key={s}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:shadow-md ${isCurrent ? "border-primary/40 bg-primary/5" : "border-border/40 bg-muted/10 hover:border-border/60"}`}
              >
                {isCurrent && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/50" />
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs font-bold text-foreground">Sem {s}</span>
                  {isCurrent && (
                    <span className="text-[8px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Now
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-emerald-500 font-semibold">
                  ₹{paid.toLocaleString()} <span className="text-muted-foreground font-normal text-[10px]">paid</span>
                </p>
                <p className="font-body text-xs text-destructive font-semibold">
                  ₹{due.toLocaleString()} <span className="text-muted-foreground font-normal text-[10px]">due</span>
                </p>
                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mt-3 border border-border/20">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${semPct}%`,
                      background:
                        semPct === 100 ? "hsl(142 70% 45%)" : semPct > 50 ? "hsl(42 87% 50%)" : "hsl(0 84% 55%)",
                    }}
                  />
                </div>
                <p className="font-body text-[10px] text-muted-foreground text-right mt-1 tabular-nums">{semPct}%</p>
              </div>
            );
          })}
        </div>
        {semChartData.some((d) => d.paid > 0 || d.due > 0) && (
          <div className="h-52 bg-muted/10 rounded-2xl border border-border/30 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} {...chartTooltipStyle} />
                <Bar dataKey="paid" fill="hsl(142, 70%, 45%)" radius={[6, 6, 0, 0]} name="Paid" />
                <Bar dataKey="due" fill="hsl(0, 84%, 55%)" radius={[6, 6, 0, 0]} name="Due" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── Charts Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Method Pie */}
        {methodChartData.length > 0 && (
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-6">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
              </div>
              Payment Methods
            </h3>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={methodChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      dataKey="value"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {methodChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} {...chartTooltipStyle} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 flex-1">
                {methodChartData.map((d, i) => (
                  <div
                    key={d.name}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/20 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="font-body text-xs text-foreground font-medium flex-1">{d.name}</span>
                    <span className="font-body text-xs text-muted-foreground tabular-nums">
                      ₹{d.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment Timeline */}
        {paymentTimeline.length > 1 && (
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-6">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-primary" />
              </div>
              Payment Timeline
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={paymentTimeline}>
                  <defs>
                    <linearGradient id="studentAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} {...chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(142, 70%, 45%)"
                    fill="url(#studentAreaGrad)"
                    strokeWidth={2}
                    name="Amount"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ─── Fee Concessions ──────────────────────────────────── */}
      {concessions.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-card/80 backdrop-blur-xl">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <div className="p-6">
            <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              Fee Concessions Applied
            </h3>
            <div className="space-y-2.5">
              {concessions.map((c: any) => {
                const effectiveAmount = c.is_percentage
                  ? Math.round(totalFee * c.amount / 100)
                  : Number(c.amount);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/10 hover:bg-amber-500/[0.06] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm font-semibold text-foreground">{c.concession_name}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-400 capitalize">
                          {c.concession_type.replace("_", "/")}
                        </span>
                      </div>
                      {c.reason && <p className="font-body text-[10px] text-muted-foreground mt-0.5 italic">"{c.reason}"</p>}
                      {c.semester && <p className="font-body text-[10px] text-muted-foreground">Semester {c.semester}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-display text-base font-bold text-emerald-400 tabular-nums">
                        {c.is_percentage ? `${c.amount}%` : `₹${Number(c.amount).toLocaleString()}`}
                      </p>
                      {c.is_percentage && (
                        <p className="font-body text-[10px] text-muted-foreground">≈ ₹{effectiveAmount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-amber-500/10 mt-3">
                <span className="font-body text-xs font-semibold text-foreground">Total Concession Value</span>
                <span className="font-display text-lg font-bold text-emerald-400 tabular-nums">
                  ₹{concessions.reduce((sum: number, c: any) => {
                    return sum + (c.is_percentage ? Math.round(totalFee * c.amount / 100) : Number(c.amount));
                  }, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment History ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent" />
        <div className="p-6 border-b border-border/40">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-primary" />
            </div>
            Complete Payment History
          </h3>
          <p className="font-body text-xs text-muted-foreground mt-1 ml-9">{payments.length} transaction(s) recorded</p>
        </div>
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="font-body text-sm text-muted-foreground">No payments recorded yet.</p>
            <p className="font-body text-xs text-muted-foreground/60 mt-1">
              Click "Record Payment" to add the first transaction.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-4">
                    Receipt
                  </th>
                  <th className="text-left font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-4">
                    Date
                  </th>
                  <th className="text-left font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-4">
                    Semester
                  </th>
                  <th className="text-left font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-4">
                    Method
                  </th>
                  <th className="text-right font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-4">
                    Amount
                  </th>
                  <th className="text-left font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-4">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any, i: number) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors duration-200 group"
                  >
                    <td className="p-4">
                      <span className="font-body text-xs font-mono font-bold text-primary">
                        {p.receipt_number || "—"}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-body text-sm text-foreground">
                        {format(new Date(p.created_at), "dd MMM yyyy")}
                      </p>
                      <p className="font-body text-[10px] text-muted-foreground">
                        {format(new Date(p.created_at), "hh:mm a")}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="font-body text-xs bg-muted/40 border border-border/30 px-2 py-1 rounded-lg">
                        {p.semester ? `Sem ${p.semester}` : "—"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-body text-xs text-foreground inline-flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                        {p.payment_method || "Cash"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-display text-sm font-bold text-emerald-500 tabular-nums">
                        ₹{Number(p.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-body text-xs text-muted-foreground">{p.remarks || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/60">
                  <td colSpan={4} className="p-4 font-display text-sm font-bold text-foreground">
                    Total
                  </td>
                  <td className="p-4 text-right font-display text-base font-bold text-emerald-500 tabular-nums">
                    ₹{payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}
                  </td>
                  <td className="p-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* Record Payment Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border/60 bg-card/95 backdrop-blur-2xl shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.15)] max-h-[85vh] overflow-y-auto">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/20 to-transparent" />
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              Record Payment
            </DialogTitle>
            <p className="font-body text-xs text-primary font-semibold">
              {student.profile?.full_name} · {student.roll_number}
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: `₹${totalFee.toLocaleString()}`, color: "text-foreground" },
                { label: "Paid", value: `₹${feePaid.toLocaleString()}`, color: "text-emerald-500" },
                { label: "Due", value: `₹${totalDue.toLocaleString()}`, color: "text-destructive" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/20 border border-border/30 rounded-xl p-3 text-center">
                  <p className={`font-display text-base font-bold ${color} tabular-nums`}>{value}</p>
                  <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1.5 block">Amount *</label>
              <input
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Enter amount"
                type="number"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1.5 block">Payment Method</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className={inputClass}
                >
                  {["Cash", "Online", "Cheque", "UPI", "DD"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1.5 block">Semester</label>
                <select
                  value={payForm.semester}
                  onChange={(e) => setPayForm((f) => ({ ...f, semester: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Current</option>
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <option key={s} value={s}>
                      Sem {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(payForm.payment_method === "Online" || payForm.payment_method === "UPI") && (
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1.5 block">Transaction / UPI Number</label>
                <input
                  value={payForm.upi_number}
                  onChange={(e) => setPayForm((f) => ({ ...f, upi_number: e.target.value }))}
                  placeholder="Enter transaction number"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1.5 block">Remarks</label>
              <input
                value={payForm.remarks}
                onChange={(e) => setPayForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional remarks"
                className={inputClass}
              />
            </div>
            <button
              onClick={() => recordPayment.mutate()}
              disabled={recordPayment.isPending}
              className="group relative w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-body font-semibold text-sm disabled:opacity-40 overflow-hidden transition-all duration-300 hover:shadow-[0_6px_24px_hsl(var(--primary)/0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Receipt className="w-4 h-4 relative" />
              <span className="relative">{recordPayment.isPending ? "Recording..." : "Record Payment"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border/60 bg-card/95 backdrop-blur-2xl shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.15)]">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/20 to-transparent" />
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-emerald-500" />
              </div>
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-4 mt-2">
              <div className="text-center py-5 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-display text-3xl font-bold text-emerald-500 tabular-nums">
                  ₹{Number(lastReceipt.amount).toLocaleString()}
                </p>
                <p className="font-body text-xs text-emerald-500/80 mt-1">Payment Recorded Successfully</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Receipt No", value: lastReceipt.receipt_number },
                  { label: "Student", value: student.profile?.full_name },
                  { label: "Roll No", value: student.roll_number },
                  { label: "Course", value: student.courses?.name || "—" },
                  { label: "Method", value: lastReceipt.payment_method },
                  { label: "Date", value: format(new Date(), "dd MMM yyyy, hh:mm a") },
                  ...(lastReceipt.remarks ? [{ label: "Remarks", value: lastReceipt.remarks }] : []),
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                  >
                    <span className="font-body text-xs text-muted-foreground">{label}</span>
                    <span className="font-body text-sm font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (!lastReceipt || !student) return;
                  const w = window.open("", "_blank", "width=500,height=750");
                  if (!w) return;
                  w.document.write(`
                    <html><head><title>Payment Receipt</title>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                      *{margin:0;padding:0;box-sizing:border-box}
                      body{font-family:'Inter',sans-serif;background:#f0f2f5;padding:24px;color:#1a1a2e}
                      .receipt{max-width:420px;margin:0 auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.05)}
                      .header{background:linear-gradient(135deg,#0a1628 0%,#1a3a6e 60%,#0a1628 100%);padding:32px 28px;text-align:center;position:relative;overflow:hidden}
                      .header::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(198,167,94,0.08) 0%,transparent 60%)}
                      .header .emoji{font-size:32px;margin-bottom:6px}
                      .header h1{color:white;font-size:18px;font-weight:800;letter-spacing:0.5px}
                      .header .sub{color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
                      .success-badge{margin:0 28px;margin-top:-20px;position:relative;z-index:2;background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #86efac;border-radius:20px;padding:20px;text-align:center}
                      .success-badge .icon{font-size:28px;margin-bottom:4px}
                      .success-badge .label{font-size:10px;color:#16a34a;font-weight:700;letter-spacing:1.5px;text-transform:uppercase}
                      .success-badge .amount{font-size:36px;font-weight:900;color:#16a34a;letter-spacing:-1px;margin-top:2px}
                      .details{padding:24px 28px}
                      .detail-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9}
                      .detail-row:last-child{border-bottom:none}
                      .detail-row .label{font-size:13px;color:#64748b;font-weight:500}
                      .detail-row .value{font-size:14px;font-weight:700;color:#0f172a;text-align:right;max-width:55%}
                      .receipt-id{background:#f8fafc;border-radius:12px;padding:10px 16px;margin:0 28px 20px;display:flex;justify-content:space-between;align-items:center;border:1px solid #e2e8f0}
                      .receipt-id .label{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px}
                      .receipt-id .value{font-size:13px;font-weight:800;color:#4f46e5;font-family:monospace;letter-spacing:1px}
                      .footer{text-align:center;padding:20px 28px 28px;background:#f8fafc;border-top:1px solid #e2e8f0}
                      .footer p{font-size:11px;color:#94a3b8;line-height:1.6}
                      .footer .contact{font-size:10px;color:#cbd5e1;margin-top:8px}
                      .seal{width:60px;height:60px;border:2px solid #e2e8f0;border-radius:50%;margin:12px auto;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
                      @media print{body{padding:0;background:white}button{display:none!important}.receipt{box-shadow:none;border:1px solid #e5e7eb}}
                    </style></head><body>
                    <div class="receipt">
                      <div class="header"><div class="emoji">🎓</div><h1>Hoysala Degree College</h1><div class="sub">Official Payment Receipt</div></div>
                      <div class="success-badge"><div class="icon">✅</div><div class="label">Payment Successful</div><div class="amount">₹${Number(lastReceipt.amount).toLocaleString()}</div></div>
                      <div class="receipt-id"><span class="label">Receipt No</span><span class="value">${lastReceipt.receipt_number}</span></div>
                      <div class="details">
                        <div class="detail-row"><span class="label">Student</span><span class="value">${student.profile?.full_name || "—"}</span></div>
                        <div class="detail-row"><span class="label">Roll Number</span><span class="value">${student.roll_number}</span></div>
                        <div class="detail-row"><span class="label">Course</span><span class="value">${student.courses?.name || "—"}</span></div>
                        <div class="detail-row"><span class="label">Semester</span><span class="value">${lastReceipt.semester ? "Semester " + lastReceipt.semester : "—"}</span></div>
                        <div class="detail-row"><span class="label">Payment Method</span><span class="value">${lastReceipt.payment_method}</span></div>
                        <div class="detail-row"><span class="label">Date & Time</span><span class="value">${format(new Date(), "dd MMM yyyy, hh:mm a")}</span></div>
                        ${lastReceipt.remarks ? `<div class="detail-row"><span class="label">Remarks</span><span class="value">${lastReceipt.remarks}</span></div>` : ""}
                      </div>
                      <div class="footer"><div class="seal">College<br/>Seal</div><p>This is a computer-generated receipt.<br/>Please keep this for your records.</p><p class="contact">📞 7676272167 | 📧 principal.hoysaladegreecollege@gmail.com</p></div>
                    </div>
                    <div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="padding:12px 40px;cursor:pointer;border:none;border-radius:14px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:white;font-weight:700;font-size:14px;font-family:Inter,sans-serif;box-shadow:0 4px 16px rgba(79,70,229,0.3)">🖨️ Print Receipt</button></div>
                    </body></html>
                  `);
                  w.document.close();
                }}
                className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-body font-semibold text-sm hover:bg-primary/15 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print / Download Receipt
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="w-full py-3 rounded-xl border border-border/40 text-muted-foreground font-body font-semibold text-sm hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Fee Details Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-border/60 bg-card/95 backdrop-blur-2xl shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.15)] max-h-[85vh] overflow-y-auto">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/20 to-transparent" />
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              Edit Fee Details
            </DialogTitle>
            <p className="font-body text-xs text-primary font-semibold">{student.profile?.full_name}</p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2 p-1 bg-muted/30 rounded-xl border border-border/30">
              <button
                onClick={() => setEditMode("total")}
                className={`flex-1 py-2.5 rounded-lg font-body text-xs font-semibold transition-all duration-200 ${editMode === "total" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Yearly Fee
              </button>
              <button
                onClick={() => setEditMode("semester")}
                className={`flex-1 py-2.5 rounded-lg font-body text-xs font-semibold transition-all duration-200 ${editMode === "semester" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Semester-wise
              </button>
            </div>
            {editMode === "total" ? (
              <div>
                <label className="font-body text-xs text-muted-foreground mb-1.5 block">Yearly Fee (₹)</label>
                <input
                  value={editForm.total_fee}
                  onChange={(e) => setEditForm((f) => ({ ...f, total_fee: e.target.value }))}
                  type="number"
                  className={inputClass}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-body text-xs text-muted-foreground">
                  Set fee for each semester. Yearly fee auto-calculates.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((sem) => (
                    <div key={sem}>
                      <label className="font-body text-[11px] text-muted-foreground mb-1 block">Semester {sem}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-xs text-muted-foreground">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={semesterFees[sem] || ""}
                          onChange={(e) => setSemesterFees((prev) => ({ ...prev, [sem]: e.target.value }))}
                          className={`${inputClass} pl-7`}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex items-center justify-between">
                  <span className="font-body text-xs font-semibold text-foreground">Auto-calculated Total</span>
                  <span className="font-display text-lg font-bold text-primary tabular-nums">
                    ₹
                    {Object.values(semesterFees)
                      .reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1.5 block">Due Date</label>
              <input
                value={editForm.fee_due_date}
                onChange={(e) => setEditForm((f) => ({ ...f, fee_due_date: e.target.value }))}
                type="date"
                className={inputClass}
              />
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1.5 block">Remarks</label>
              <textarea
                value={editForm.fee_remarks}
                onChange={(e) => setEditForm((f) => ({ ...f, fee_remarks: e.target.value }))}
                rows={3}
                placeholder="Fee remarks..."
                className={inputClass}
              />
            </div>
            <button
              onClick={() => updateFee.mutate()}
              disabled={updateFee.isPending}
              className="group relative w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-body font-semibold text-sm disabled:opacity-40 overflow-hidden transition-all duration-300 hover:shadow-[0_6px_24px_hsl(var(--primary)/0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <FileText className="w-4 h-4 relative" />
              <span className="relative">{updateFee.isPending ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Reminder Modal */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border/60 bg-card/95 backdrop-blur-2xl shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.15)]">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/20 to-transparent" />
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-500" />
              </div>
              Send Fee Reminder
            </DialogTitle>
            <p className="font-body text-xs text-primary font-semibold">To: {student.profile?.full_name}</p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-muted/20 border border-border/30 rounded-xl p-4">
              <p className="font-body text-xs text-muted-foreground mb-3">
                This will send an in-app + push + email notification to the student.
              </p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="font-display text-lg font-bold text-destructive tabular-nums">
                    ₹{totalDue.toLocaleString()}
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
                </div>
                {student.fee_due_date && (
                  <div className="text-center">
                    <p
                      className={`font-display text-lg font-bold ${isOverdue ? "text-destructive" : "text-foreground"}`}
                    >
                      {format(new Date(student.fee_due_date), "dd MMM")}
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Due Date</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1.5 block">Reminder Message</label>
              <textarea
                value={reminderMsg}
                onChange={(e) => setReminderMsg(e.target.value)}
                rows={4}
                className={inputClass}
              />
            </div>
            <button
              onClick={() => sendReminder.mutate()}
              disabled={sendReminder.isPending}
              className="group relative w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-body font-semibold text-sm disabled:opacity-40 overflow-hidden transition-all duration-300 hover:shadow-[0_6px_24px_hsl(42_87%_55%/0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Send className="w-4 h-4 relative" />
              <span className="relative">{sendReminder.isPending ? "Sending..." : "Send Reminder"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
