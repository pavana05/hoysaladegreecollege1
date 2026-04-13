import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DollarSign, Plus, ArrowLeft, Users, TrendingUp, AlertCircle, Phone, CheckCircle,
  Receipt, Download, PieChart, BarChart3, Calendar, Search, Filter, IndianRupee,
  CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Clock, FileText, Layers, Printer,
  Shield, Lock, Sparkles, Eye, Tag
} from "lucide-react";
import FeeConcessions from "@/components/fee/FeeConcessions";
import { Link } from "react-router-dom";
import { generateFeeReceiptHtml } from "@/lib/generate-fee-receipt-html";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CHART_COLORS = ["hsl(142, 70%, 45%)", "hsl(0, 84%, 60%)", "hsl(42, 87%, 55%)", "hsl(217, 72%, 55%)", "hsl(280, 60%, 55%)"];

export default function AdminFeeManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem("hdc-fee-pin-unlocked") === "1");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "Cash", remarks: "", upi_number: "", semester: "" });
  const [courseFilter, setCourseFilter] = useState("all");
  const [feeFilter, setFeeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [receiptSearch, setReceiptSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [statsCourseFilter, setStatsCourseFilter] = useState("all");
  const [statsSemFilter, setStatsSemFilter] = useState("all");
  const [statsStudentSearch, setStatsStudentSearch] = useState("");
  const [feeEditStudent, setFeeEditStudent] = useState<any>(null);
  const [feeEditForm, setFeeEditForm] = useState({ total_fee: "", fee_due_date: "", fee_remarks: "", payment_method: "Cash", upi_number: "" });
  const [feeEditMode, setFeeEditMode] = useState<"total" | "semester">("total");
  const [feeEditSemFees, setFeeEditSemFees] = useState<Record<number, string>>({});
  const [receiptStudent, setReceiptStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "concessions">("overview");
  const [receiptPayment, setReceiptPayment] = useState<any>(null);
  const paymentModalRef = useRef<HTMLDivElement>(null);

  // Check if PIN exists
  const { data: pinData, isLoading: pinLoading } = useQuery({
    queryKey: ["fee-management-pin"],
    queryFn: async () => {
      const { data } = await supabase.from("fee_management_pin").select("pin_hash").limit(1);
      return data && data.length > 0 ? data[0].pin_hash : null;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["fee-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["fee-students", courseFilter],
    queryFn: async () => {
      let q = supabase.from("students").select("*, courses(name, code)").eq("is_active", true);
      if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
      const { data: studs } = await q;
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone");
      return (studs || []).map((s: any) => ({
        ...s,
        profile: profs?.find((p: any) => p.user_id === s.user_id),
      }));
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["fee-payments", selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data } = await supabase.from("fee_payments").select("*").eq("student_id", selectedStudent.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedStudent,
  });

  // Fetch all semester fees for defaulters calculation
  const { data: allSemesterFees = [] } = useQuery({
    queryKey: ["all-semester-fees"],
    queryFn: async () => {
      const { data } = await supabase.from("semester_fees").select("student_id, semester, fee_amount").order("semester");
      return data || [];
    },
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["all-fee-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("fee_payments").select("*, students(roll_number, user_id)").order("created_at", { ascending: false }).limit(200);
      if (!data) return [];
      const userIds = [...new Set(data.map((p: any) => p.students?.user_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        profs?.forEach((p: any) => { profilesMap[p.user_id] = p.full_name; });
      }
      return data.map((p: any) => ({
        ...p,
        student_name: p.students?.user_id ? profilesMap[p.students.user_id] || "" : "",
        student_roll: p.students?.roll_number || "",
      }));
    },
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !paymentForm.amount) throw new Error("Fill amount");
      const amount = parseFloat(paymentForm.amount);
      const newPaid = (selectedStudent.fee_paid || 0) + amount;
      // Atomic sequential receipt number via database sequence
      const { data: seqData, error: seqErr } = await supabase.rpc("next_receipt_number");
      if (seqErr || !seqData) throw new Error("Failed to generate receipt number");
      const receipt_number = seqData as string;
      const upiInfo = (paymentForm.payment_method === "Online" || paymentForm.payment_method === "UPI") && paymentForm.upi_number
        ? `[UPI: ${paymentForm.upi_number}] `
        : "";
      const remarks = `${upiInfo}${paymentForm.remarks || ""}`.trim();
      await supabase.from("fee_payments").insert({
        student_id: selectedStudent.id, amount,
        payment_method: paymentForm.payment_method,
        remarks,
        receipt_number,
        recorded_by: user?.id,
        semester: paymentForm.semester ? parseInt(paymentForm.semester) : (selectedStudent.semester || null),
      });
      await supabase.from("students").update({ fee_paid: newPaid }).eq("id", selectedStudent.id);
      return { receipt_number, amount, payment_method: paymentForm.payment_method, remarks };
    },
    onSuccess: async (data) => {
      toast.success("Payment recorded successfully!");
      qc.invalidateQueries({ queryKey: ["fee-students"] });
      qc.invalidateQueries({ queryKey: ["fee-payments"] });
      qc.invalidateQueries({ queryKey: ["all-fee-payments"] });
      setReceiptStudent(selectedStudent);
      setReceiptPayment({ ...data, created_at: new Date().toISOString(), student_name: selectedStudent.profile?.full_name, roll_number: selectedStudent.roll_number, course: selectedStudent.courses?.name });
      const studentEmail = selectedStudent.profile?.email;
      if (studentEmail) {
        try {
          await supabase.functions.invoke("send-fee-receipt", {
            body: {
              studentEmail,
              studentName: selectedStudent.profile?.full_name || "",
              receiptNumber: data.receipt_number,
              amount: data.amount,
              paymentMethod: data.payment_method,
              courseName: selectedStudent.courses?.name || "",
              rollNumber: selectedStudent.roll_number || "",
              remarks: data.remarks || "",
              date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            },
          });
          toast.success("Receipt emailed to student!");
        } catch (e) {
          console.error("Email send failed:", e);
        }
      }
      setPaymentForm({ amount: "", payment_method: "Cash", remarks: "", upi_number: "", semester: "" });
      setSelectedStudent((prev: any) => prev ? { ...prev, fee_paid: (prev.fee_paid || 0) + parseFloat(paymentForm.amount) } : null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateFee = useMutation({
    mutationFn: async () => {
      if (!feeEditStudent) return;
      if (feeEditMode === "semester") {
        const entries = Object.entries(feeEditSemFees).filter(([_, v]) => v && parseFloat(v) > 0);
        for (const [sem, amount] of entries) {
          await supabase.from("semester_fees").upsert({
            student_id: feeEditStudent.id,
            semester: parseInt(sem),
            fee_amount: parseFloat(amount) || 0,
            due_date: feeEditForm.fee_due_date || null,
            remarks: feeEditForm.fee_remarks || "",
            updated_by: user?.id,
          }, { onConflict: "student_id,semester" });
        }
        const { data: allSemFees } = await supabase.from("semester_fees").select("fee_amount").eq("student_id", feeEditStudent.id);
        const totalFromSemesters = (allSemFees || []).reduce((sum: number, f: any) => sum + Number(f.fee_amount), 0);
        await supabase.from("students").update({
          total_fee: totalFromSemesters,
          fee_due_date: feeEditForm.fee_due_date || null,
          fee_remarks: feeEditForm.fee_remarks || "",
        }).eq("id", feeEditStudent.id);
      } else {
        await supabase.from("students").update({
          total_fee: parseFloat(feeEditForm.total_fee) || 0,
          fee_due_date: feeEditForm.fee_due_date || null,
          fee_remarks: feeEditForm.fee_remarks || "",
        }).eq("id", feeEditStudent.id);
      }
    },
    onSuccess: () => {
      toast.success("Fee details updated!");
      qc.invalidateQueries({ queryKey: ["fee-students"] });
      setFeeEditStudent(null);
    },
    onError: () => toast.error("Failed to update fee details"),
  });

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutRemaining(0);
        setPinError("");
      }
    }, 200);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handlePinSubmit = () => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    setPinChecking(true);
    setPinError("");
    if (pinInput === pinData) {
      setPinUnlocked(true);
      sessionStorage.setItem("hdc-fee-pin-unlocked", "1");
      setPinChecking(false);
      setFailedAttempts(0);
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        const unlockTime = Date.now() + 30000;
        setLockoutUntil(unlockTime);
        setLockoutRemaining(30);
        setPinError("Too many failed attempts. Locked for 30 seconds.");
        setFailedAttempts(0);
      } else {
        setPinError(`Incorrect PIN. ${3 - newAttempts} attempt(s) remaining.`);
      }
      setPinInput("");
      setPinChecking(false);
    }
  };

  useEffect(() => {
    if (!pinLoading && !pinData) {
      setPinUnlocked(true);
      sessionStorage.setItem("hdc-fee-pin-unlocked", "1");
    }
  }, [pinLoading, pinData]);

  // Clear PIN on page unload (reload/close)
  useEffect(() => {
    const handleUnload = () => sessionStorage.removeItem("hdc-fee-pin-unlocked");
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Loading state
  if (pinLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-ping" />
          </div>
          <p className="font-body text-sm text-muted-foreground animate-pulse">Initializing secure access...</p>
        </div>
      </div>
    );
  }

  // ─── PIN Gate ───────────────────────────────────────────────
  if (pinData && !pinUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] animate-fade-in">
        <div className="relative w-full max-w-[420px]">
          {/* Ambient glow behind card */}
          <div className="absolute -inset-8 rounded-[40px] bg-primary/[0.04] blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-[hsl(var(--gold))]/[0.03] blur-[80px] pointer-events-none" />
          
          <div className="relative bg-card/80 backdrop-blur-2xl border border-border/60 rounded-3xl p-8 shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.15)] text-center space-y-7">
            {/* Top accent */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/20 to-transparent" />
            
            {/* Shield icon */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-xl" />
              <div className="relative w-20 h-20 rounded-[22px] bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
                <Shield className="w-9 h-9 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[hsl(var(--gold))] flex items-center justify-center shadow-lg">
                <Lock className="w-3.5 h-3.5 text-[hsl(230,15%,6%)]" />
              </div>
            </div>
            
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">Fee Management Console</h2>
              <p className="font-body text-sm text-muted-foreground mt-2 leading-relaxed">Enter your 6-digit secure PIN to unlock access</p>
            </div>
            
            {/* PIN Input */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="● ● ● ● ● ●"
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPinInput(val);
                  setPinError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && pinInput.length === 6) handlePinSubmit(); }}
                className="relative w-full text-center text-3xl tracking-[0.5em] font-mono rounded-2xl h-[72px] bg-muted/50 border border-border/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-muted/70 outline-none transition-all duration-300 placeholder:text-muted-foreground/30 placeholder:tracking-[0.3em] placeholder:text-xl"
              />
              {pinError && (
                <div className={`mt-3 flex items-center justify-center gap-2 animate-fade-in ${lockoutUntil ? "text-amber-500" : "text-destructive"}`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <p className="font-body text-xs font-medium">{pinError}</p>
                </div>
              )}
              {lockoutRemaining > 0 && (
                <div className="mt-2 flex items-center justify-center gap-2 animate-fade-in">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                  <p className="font-body text-xs text-amber-500 font-semibold tabular-nums">Retry in {lockoutRemaining}s</p>
                </div>
              )}
            </div>
            
            {/* Unlock Button */}
            <button
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 6 || pinChecking || lockoutRemaining > 0}
              className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-body font-semibold text-sm disabled:opacity-40 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.3)] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                {pinChecking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Unlock Console
                  </>
                )}
              </span>
            </button>
            
            <Link to="/dashboard/admin" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="font-body text-xs">Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Console ───────────────────────────────────────────

  const filteredStudents = students.filter((s: any) => {
    const name = s.profile?.full_name || "";
    const roll = s.roll_number || "";
    const email = s.profile?.email || "";
    const phone = s.profile?.phone || s.phone || "";
    const searchLower = search.toLowerCase();
    const matchSearch = !search || name.toLowerCase().includes(searchLower) || roll.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower) || phone.includes(search);
    const due = (s.total_fee || 0) - (s.fee_paid || 0);
    const matchFee = feeFilter === "all" || (feeFilter === "due" && due > 0) || (feeFilter === "paid" && due <= 0) || (feeFilter === "overdue" && due > 0 && s.fee_due_date && new Date(s.fee_due_date) < new Date());
    const matchSem = semesterFilter === "all" || String(s.semester) === semesterFilter;
    return matchSearch && matchFee && matchSem;
  });

  const statsFilteredStudents = students.filter((s: any) => {
    const matchCourse = statsCourseFilter === "all" || s.course_id === statsCourseFilter;
    const matchSem = statsSemFilter === "all" || String(s.semester) === statsSemFilter;
    const matchSearch = !statsStudentSearch || (s.profile?.full_name || "").toLowerCase().includes(statsStudentSearch.toLowerCase()) || (s.roll_number || "").toLowerCase().includes(statsStudentSearch.toLowerCase());
    return matchCourse && matchSem && matchSearch;
  });

  const totalFees = statsFilteredStudents.reduce((sum: number, s: any) => sum + (s.total_fee || 0), 0);
  const totalPaid = statsFilteredStudents.reduce((sum: number, s: any) => sum + (s.fee_paid || 0), 0);
  const totalDue = totalFees - totalPaid;
  const dueCount = statsFilteredStudents.filter((s: any) => (s.total_fee || 0) - (s.fee_paid || 0) > 0).length;
  const paidCount = statsFilteredStudents.filter((s: any) => (s.total_fee || 0) > 0 && (s.total_fee || 0) - (s.fee_paid || 0) <= 0).length;
  const overdueCount = statsFilteredStudents.filter((s: any) => {
    const due = (s.total_fee || 0) - (s.fee_paid || 0);
    return due > 0 && s.fee_due_date && new Date(s.fee_due_date) < new Date();
  }).length;
  const collectionRate = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;
  const statsStudentIds = new Set(statsFilteredStudents.map((s: any) => s.id));
  const statsPayments = allPayments.filter((p: any) => statsStudentIds.has(p.student_id));
  const onlinePaymentCount = statsPayments.filter((p: any) => p.payment_method === "Online" || p.payment_method === "UPI").length;

  const methodBreakdown = allPayments.reduce((acc: Record<string, number>, p: any) => {
    acc[p.payment_method || "Cash"] = (acc[p.payment_method || "Cash"] || 0) + Number(p.amount);
    return acc;
  }, {});
  const methodChartData = Object.entries(methodBreakdown).map(([name, value]) => ({ name, value }));

  const courseWiseFees = courses.map((c: any) => {
    const courseStudents = students.filter((s: any) => s.course_id === c.id);
    const total = courseStudents.reduce((s: number, st: any) => s + (st.total_fee || 0), 0);
    const paid = courseStudents.reduce((s: number, st: any) => s + (st.fee_paid || 0), 0);
    return { name: c.code, total, paid, due: total - paid };
  }).filter(c => c.total > 0);

  const monthlyTrends = (() => {
    const months: Record<string, number> = {};
    allPayments.forEach((p: any) => {
      const m = format(new Date(p.created_at), "MMM yyyy");
      months[m] = (months[m] || 0) + Number(p.amount);
    });
    return Object.entries(months).reverse().slice(0, 12).reverse().map(([month, amount]) => ({ month, amount }));
  })();

  const inputClass = "w-full border border-border/60 rounded-xl px-3.5 py-2.5 font-body text-sm bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-muted/50 transition-all duration-300 placeholder:text-muted-foreground/50";

  const exportCSV = () => {
    const rows = filteredStudents.map((s: any) => {
      const due = (s.total_fee || 0) - (s.fee_paid || 0);
      return [s.profile?.full_name || "", s.roll_number, s.courses?.name || "", s.semester, s.total_fee || 0, s.fee_paid || 0, due, s.fee_due_date || "", s.profile?.phone || "", s.fee_remarks || ""].map(v => `"${v}"`).join(",");
    });
    const header = "Name,Roll No,Course,Semester,Yearly Fee,Fee Paid,Fee Due,Due Date,Phone,Remarks";
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `fee_report_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    toast.success("Fee report exported!");
  };

  const exportDefaultersCSV = () => {
    const defaulters = filteredStudents.filter((s: any) => (s.total_fee || 0) - (s.fee_paid || 0) > 0);
    if (defaulters.length === 0) { toast.info("No defaulters to export"); return; }
    const rows = defaulters.map((s: any) => {
      const due = (s.total_fee || 0) - (s.fee_paid || 0);
      return [s.profile?.full_name || "", s.roll_number, s.courses?.name || "", s.semester, s.total_fee || 0, s.fee_paid || 0, due, s.fee_due_date || "", s.profile?.phone || "", s.parent_phone || ""].map(v => `"${v}"`).join(",");
    });
    const csv = ["Name,Roll No,Course,Semester,Yearly Fee,Paid,Due,Due Date,Phone,Parent Phone", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `fee_defaulters_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    toast.success("Defaulters report exported!");
  };

  const printReceipt = async () => {
    if (!receiptPayment) return;
    const studentId = receiptStudent?.id || selectedStudent?.id;
    // Fetch semester fees for this student
    let semesterFees: { semester: number; fee_amount: number; paid: number }[] = [];
    if (studentId) {
      const { data: semFees } = await supabase.from("semester_fees").select("semester, fee_amount").eq("student_id", studentId).order("semester");
      const { data: semPayments } = await supabase.from("fee_payments").select("semester, amount").eq("student_id", studentId);
      const paidBySem: Record<number, number> = {};
      (semPayments || []).forEach((p: any) => { if (p.semester) paidBySem[p.semester] = (paidBySem[p.semester] || 0) + Number(p.amount); });
      semesterFees = (semFees || []).map((sf: any) => ({
        semester: sf.semester,
        fee_amount: Number(sf.fee_amount),
        paid: paidBySem[sf.semester] || 0,
      }));
    }
    // Fetch recent payments
    let recentPayments: { receipt: string; amount: number; date: string; method: string; semester?: number | null }[] = [];
    if (studentId) {
      const { data: rp } = await supabase.from("fee_payments").select("receipt_number, amount, payment_date, payment_method, semester").eq("student_id", studentId).order("created_at", { ascending: false }).limit(5);
      recentPayments = (rp || []).map((p: any) => ({
        receipt: p.receipt_number || "—",
        amount: Number(p.amount),
        date: p.payment_date || "—",
        method: p.payment_method || "Cash",
        semester: p.semester,
      }));
    }
    const stu = receiptStudent || selectedStudent;
    const totalFee = stu?.total_fee || 0;
    const totalPaid = (stu?.fee_paid || 0);
    const html = generateFeeReceiptHtml({
      receiptNumber: receiptPayment.receipt_number,
      amount: receiptPayment.amount,
      studentName: receiptPayment.student_name || stu?.profile?.full_name || "—",
      rollNumber: receiptPayment.roll_number || stu?.roll_number || "—",
      courseName: receiptPayment.course || stu?.courses?.name || "—",
      semester: receiptPayment.semester || stu?.semester,
      paymentMethod: receiptPayment.payment_method,
      dateTime: format(new Date(receiptPayment.created_at), "dd MMM yyyy, hh:mm a"),
      remarks: receiptPayment.remarks,
      totalFee,
      totalPaid,
      totalBalance: Math.max(0, totalFee - totalPaid),
      semesterFees,
      recentPayments,
      fatherName: stu?.father_name,
      phone: stu?.phone || stu?.profile?.phone,
    });
    const w = window.open("", "_blank", "width=560,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const statCards = [
    { label: "Yearly Fees", value: `₹${totalFees.toLocaleString()}`, icon: IndianRupee, gradient: "from-[hsl(var(--primary))]/15 to-[hsl(var(--primary))]/5", iconBg: "bg-primary/15", iconColor: "text-primary", borderColor: "border-primary/15", glow: "group-hover:shadow-[0_0_40px_hsl(var(--primary)/0.1)]" },
    { label: "Collected", value: `₹${totalPaid.toLocaleString()}`, icon: CheckCircle, gradient: "from-emerald-500/15 to-emerald-500/5", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", borderColor: "border-emerald-500/15", glow: "group-hover:shadow-[0_0_40px_hsl(142_70%_45%/0.1)]" },
    { label: "Pending", value: `₹${totalDue.toLocaleString()}`, icon: AlertCircle, gradient: "from-red-500/15 to-red-500/5", iconBg: "bg-red-500/15", iconColor: "text-red-400", borderColor: "border-red-500/15", glow: "group-hover:shadow-[0_0_40px_hsl(0_84%_60%/0.1)]" },
    { label: "Collection Rate", value: `${collectionRate}%`, icon: TrendingUp, gradient: "from-blue-500/15 to-blue-500/5", iconBg: "bg-blue-500/15", iconColor: "text-blue-400", borderColor: "border-blue-500/15", glow: "group-hover:shadow-[0_0_40px_hsl(217_72%_55%/0.1)]" },
    { label: "Fee Due", value: String(dueCount), icon: Users, gradient: "from-amber-500/15 to-amber-500/5", iconBg: "bg-amber-500/15", iconColor: "text-amber-400", borderColor: "border-amber-500/15", glow: "group-hover:shadow-[0_0_40px_hsl(42_87%_55%/0.1)]" },
    { label: "Overdue", value: String(overdueCount), icon: Clock, gradient: "from-red-600/15 to-red-600/5", iconBg: "bg-red-600/15", iconColor: "text-red-500", borderColor: "border-red-600/15", glow: "group-hover:shadow-[0_0_40px_hsl(0_70%_45%/0.1)]" },
    { label: "Online Payments", value: String(onlinePaymentCount), icon: CreditCard, gradient: "from-purple-500/15 to-purple-500/5", iconBg: "bg-purple-500/15", iconColor: "text-purple-400", borderColor: "border-purple-500/15", glow: "group-hover:shadow-[0_0_40px_hsl(280_60%_55%/0.1)]" },
  ];

  return (
    <div className="space-y-7 animate-fade-in pb-8">
      {/* ─── Premium Header ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-2xl">
        {/* Multi-layer ambient effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-[hsl(var(--gold))]/[0.03]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/3 blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[hsl(var(--gold))]/[0.03] rounded-full translate-y-1/2 -translate-x-1/4 blur-[60px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        
        <div className="relative p-7 md:p-9">
          <div className="flex items-start gap-4">
            <Link to="/dashboard/admin" className="p-2.5 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/60 hover:border-border transition-all duration-300 shrink-0 mt-1">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-[hsl(var(--gold))]/[0.08] border border-[hsl(var(--gold))]/15 rounded-full px-4 py-1.5 mb-3">
                <Sparkles className="w-3 h-3 text-[hsl(var(--gold))]" />
                <span className="font-body text-[11px] text-[hsl(var(--gold))] font-semibold uppercase tracking-[0.15em]">Financial Hub</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">Fee Management Console</h2>
              <p className="font-body text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">Comprehensive dashboard for tracking payments, managing dues, and generating financial reports.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab Switcher ─── */}
      <div className="flex gap-1.5 p-1 bg-muted/20 rounded-xl border border-border/30 w-fit">
        <button onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-xs font-semibold transition-all duration-300 ${activeTab === "overview" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
          <IndianRupee className="w-3.5 h-3.5" /> Fee Overview
        </button>
        <button onClick={() => setActiveTab("concessions")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-xs font-semibold transition-all duration-300 ${activeTab === "concessions" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
          <Tag className="w-3.5 h-3.5" /> Concessions
        </button>
      </div>

      {activeTab === "concessions" ? (
        <FeeConcessions students={students} courses={courses} />
      ) : (
      <>
      {/* ─── Stats Summary Filter ─── */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-5">
        <h3 className="font-body text-xs font-semibold text-foreground mb-4 uppercase tracking-[0.12em] flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[hsl(var(--gold))]" /> Filter Fee Summary
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={statsStudentSearch} onChange={e => setStatsStudentSearch(e.target.value)}
              placeholder="Search student..."
              className={`${inputClass} pl-10`} />
          </div>
          <select value={statsCourseFilter} onChange={e => setStatsCourseFilter(e.target.value)} className={`${inputClass} w-auto min-w-[140px]`}>
            <option value="all">All Courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
          <select value={statsSemFilter} onChange={e => setStatsSemFilter(e.target.value)} className={`${inputClass} w-auto min-w-[130px]`}>
            <option value="all">All Semesters</option>
            {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
          </select>
          {(statsCourseFilter !== "all" || statsSemFilter !== "all" || statsStudentSearch) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatsCourseFilter("all"); setStatsSemFilter("all"); setStatsStudentSearch(""); }} className="rounded-xl font-body text-xs hover:bg-destructive/10 hover:text-destructive">
              ✕ Clear
            </Button>
          )}
        </div>
        {(statsCourseFilter !== "all" || statsSemFilter !== "all" || statsStudentSearch) && (
          <p className="font-body text-[10px] text-muted-foreground mt-3 flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Showing stats for {statsFilteredStudents.length} of {students.length} students
          </p>
        )}
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]" style={{ background: 'linear-gradient(135deg, hsl(230,12%,7%) 0%, hsl(228,14%,10%) 50%, hsl(230,10%,6%) 100%)' }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(var(--gold)), transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, hsl(var(--gold) / 0.2) 50%, transparent 90%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, hsl(var(--gold) / 0.12) 50%, transparent 90%)' }} />

        <div className="relative grid grid-cols-2 lg:grid-cols-7 divide-x divide-white/[0.04]">
          {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }, idx) => (
            <div key={label} className="group relative p-5 hover:bg-white/[0.02] transition-all duration-500 cursor-default" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className={`w-10 h-10 rounded-xl ${iconBg} backdrop-blur-sm flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-500 border border-white/[0.06] shadow-lg`}>
                <Icon className={`w-[18px] h-[18px] ${iconColor}`} strokeWidth={1.8} />
              </div>
              <p className="text-[22px] font-bold text-white/90 tabular-nums tracking-tight leading-none" style={{ fontFamily: "'Inter', 'Roboto', system-ui, sans-serif" }}>{value}</p>
              <p className="text-[9px] text-white/35 mt-2 uppercase tracking-[0.2em] font-medium" style={{ fontFamily: "'Inter', 'Roboto', system-ui, sans-serif" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Analytics Row ─── */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Collection Progress Ring */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.08)] transition-all duration-500">
          <h3 className="font-display text-sm font-bold text-foreground mb-5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <PieChart className="w-3.5 h-3.5 text-primary" />
            </div>
            Collection Overview
          </h3>
          <div className="flex items-center gap-7">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" opacity="0.4" />
                <circle cx="50" cy="50" r="40" fill="none"
                  stroke={collectionRate >= 80 ? "hsl(142, 70%, 45%)" : collectionRate >= 50 ? "hsl(42, 87%, 55%)" : "hsl(0, 84%, 60%)"}
                  strokeWidth="8"
                  strokeDasharray={`${(collectionRate / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 drop-shadow-sm" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold text-foreground">{collectionRate}%</span>
                <span className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Collected</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {[
                { label: "Fully Paid", count: paidCount, color: "bg-emerald-500" },
                { label: "Partially Paid", count: dueCount - overdueCount, color: "bg-amber-500" },
                { label: "Overdue", count: overdueCount, color: "bg-red-500" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />
                    <span className="font-body text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className="font-body text-sm font-bold text-foreground tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.08)] transition-all duration-500">
          <h3 className="font-display text-sm font-bold text-foreground mb-5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            </div>
            Payment Methods
          </h3>
          {methodChartData.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={methodChartData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={3} dataKey="value"
                    label={({ name, value }) => `${name}: ₹${Number(value).toLocaleString()}`}
                    style={{ fontSize: 10, fontFamily: "Inter" }}>
                    {methodChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 14, fontFamily: "Inter", fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)" }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-44 text-muted-foreground font-body text-sm">No payment data yet</div>
          )}
        </div>
      </div>

      {/* ─── Monthly Collection Trends ─── */}
      {monthlyTrends.length > 1 && (
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.08)] transition-all duration-500">
          <h3 className="font-display text-sm font-bold text-foreground mb-5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            Monthly Collection Trends
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 14, fontFamily: "Inter", fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)" }} formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="amount" stroke="hsl(142, 70%, 45%)" fill="url(#feeGrad)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(142, 70%, 45%)", strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6, strokeWidth: 3 }} name="Collected" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Course-wise Fee Collection ─── */}
      {courseWiseFees.length > 0 && (
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.08)] transition-all duration-500">
          <h3 className="font-display text-sm font-bold text-foreground mb-5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
            </div>
            Course-wise Fee Collection
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseWiseFees} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, fontFamily: "Inter", fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)" }} formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="paid" fill="hsl(142, 70%, 45%)" radius={[6, 6, 0, 0]} name="Collected" />
                <Bar dataKey="due" fill="hsl(0, 84%, 60%)" radius={[6, 6, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Student Filters ─── */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-[250px] sm:min-w-[320px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, roll number or email..."
              className={`${inputClass} pl-11 pr-10`} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all text-xs">✕</button>
            )}
          </div>
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="all">All Courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="all">All Semesters</option>
            {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
          </select>
          <select value={feeFilter} onChange={e => setFeeFilter(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="all">All Students</option>
            <option value="due">Fee Due</option>
            <option value="paid">Fully Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mt-4">
          <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl font-body text-xs border-border/60 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all duration-300">
            <Download className="w-3 h-3 mr-1.5" /> Export All
          </Button>
          <Button variant="outline" size="sm" onClick={exportDefaultersCSV} className="rounded-xl font-body text-xs border-destructive/20 hover:bg-destructive/5 hover:border-destructive/30 hover:text-destructive transition-all duration-300">
            <AlertCircle className="w-3 h-3 mr-1.5" /> Export Defaulters
          </Button>
          <div className="ml-auto font-body text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> {filteredStudents.length} of {students.length} students
          </div>
        </div>
      </div>

      {/* ─── Students Table ─── */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.08)] transition-all duration-500">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="text-left font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Student</th>
                <th className="text-left font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Course</th>
                <th className="text-right font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Yearly Fee</th>
                <th className="text-right font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Paid</th>
                <th className="text-right font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Due</th>
                <th className="text-center font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Due Date</th>
                <th className="text-center font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Progress</th>
                <th className="text-center font-body text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="p-3"><Skeleton className="h-14 rounded-xl" /></td></tr>
              )) : filteredStudents.map((s: any) => {
                const due = (s.total_fee || 0) - (s.fee_paid || 0);
                const pct = s.total_fee > 0 ? Math.round(((s.fee_paid || 0) / s.total_fee) * 100) : 0;
                const isOverdue = due > 0 && s.fee_due_date && new Date(s.fee_due_date) < new Date();
                return (
                  <tr key={s.id} className={`border-b border-border/30 hover:bg-muted/15 transition-all duration-200 ${isOverdue ? "bg-destructive/[0.03]" : ""}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="font-display text-sm font-bold text-primary">{(s.profile?.full_name || "?")[0]}</span>
                        </div>
                        <div>
                          <p className="font-body text-sm font-semibold text-foreground">{s.profile?.full_name || "—"}</p>
                          <p className="font-body text-[11px] text-muted-foreground">{s.roll_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-body text-xs px-2.5 py-1 rounded-lg bg-muted/30 text-muted-foreground font-medium">{s.courses?.code || "—"} · Sem {s.semester}</span>
                    </td>
                    <td className="font-body text-sm p-4 font-semibold text-right tabular-nums text-foreground">₹{(s.total_fee || 0).toLocaleString()}</td>
                    <td className="font-body text-sm p-4 text-emerald-400 font-semibold text-right tabular-nums">₹{(s.fee_paid || 0).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <span className={`font-body text-sm font-bold tabular-nums ${due > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {due > 0 ? `₹${due.toLocaleString()}` : "✓ Cleared"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {s.fee_due_date ? (
                        <span className={`inline-flex items-center gap-1 font-body text-xs px-2.5 py-1 rounded-lg ${isOverdue ? "bg-destructive/10 text-destructive font-bold" : "text-muted-foreground bg-muted/20"}`}>
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                          {format(new Date(s.fee_due_date), "MMM d, yyyy")}
                        </span>
                      ) : <span className="font-body text-xs text-muted-foreground/50">—</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden min-w-[50px] max-w-[80px]">
                          <div className="h-full rounded-full transition-all duration-1000" style={{
                            width: `${pct}%`,
                            background: pct === 100 ? "hsl(142 70% 45%)" : pct > 50 ? "hsl(42 87% 55%)" : "hsl(0 84% 60%)"
                          }} />
                        </div>
                        <span className="font-body text-[11px] font-bold text-muted-foreground tabular-nums w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={`/dashboard/admin/fees/${s.id}`}
                          className="group relative px-3 py-1.5 rounded-xl font-body text-[11px] font-semibold inline-flex items-center gap-1.5 overflow-hidden border border-primary/20 bg-primary/5 text-primary backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_20px_hsl(var(--primary)/0.12)] hover:border-primary/40 hover:bg-primary/10 active:scale-[0.97]">
                          <Users className="w-3 h-3 relative z-10" />
                          <span className="relative z-10">View</span>
                        </Link>
                        <button onClick={() => { setSelectedStudent(s); setTimeout(() => paymentModalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100); }}
                          className="group relative px-3 py-1.5 rounded-xl font-body text-[11px] font-semibold inline-flex items-center gap-1.5 overflow-hidden border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_20px_hsl(142_70%_45%/0.12)] hover:border-emerald-500/40 hover:bg-emerald-500/10 active:scale-[0.97]">
                          <Receipt className="w-3 h-3 relative z-10" />
                          <span className="relative z-10">Pay</span>
                        </button>
                        <button onClick={async () => { setFeeEditStudent(s); setFeeEditForm({ total_fee: String(s.total_fee || ""), fee_due_date: s.fee_due_date || "", fee_remarks: s.fee_remarks || "", payment_method: "Cash", upi_number: "" }); setFeeEditMode("total"); const { data: sf } = await supabase.from("semester_fees").select("*").eq("student_id", s.id); const semMap: Record<number, string> = {}; (sf || []).forEach((f: any) => { semMap[f.semester] = String(f.fee_amount); }); setFeeEditSemFees(semMap); }}
                          className="group relative px-3 py-1.5 rounded-xl font-body text-[11px] font-semibold inline-flex items-center gap-1.5 overflow-hidden border border-amber-500/20 bg-amber-500/5 text-amber-400 backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_20px_hsl(42_87%_55%/0.12)] hover:border-amber-500/40 hover:bg-amber-500/10 active:scale-[0.97]">
                          <FileText className="w-3 h-3 relative z-10" />
                          <span className="relative z-10">Edit</span>
                        </button>
                        {s.profile?.phone && (
                          <a href={`tel:${s.profile.phone}`} className="p-1.5 rounded-xl border border-border/30 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20 transition-all duration-300">
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filteredStudents.length === 0 && (
                <tr><td colSpan={8} className="text-center p-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="font-body text-sm text-muted-foreground">No students found</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Fee Defaulters ─── */}
      <div className="bg-card/60 backdrop-blur-xl border border-destructive/15 rounded-2xl overflow-hidden hover:shadow-[0_10px_40px_-10px_hsl(0_84%_60%/0.08)] transition-all duration-500">
        <div className="p-5 border-b border-border/40 bg-destructive/[0.03] flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            </div>
            Fee Defaulters — Current Semester
          </h3>
          <span className="font-body text-[11px] bg-destructive/10 text-destructive px-3 py-1.5 rounded-full font-bold tabular-nums">
            {(() => {
              // Calculate current semester defaulters
              const semFeeMap: Record<string, Record<number, number>> = {};
              allSemesterFees.forEach((sf: any) => {
                if (!semFeeMap[sf.student_id]) semFeeMap[sf.student_id] = {};
                semFeeMap[sf.student_id][sf.semester] = Number(sf.fee_amount);
              });
              const semPayMap: Record<string, Record<number, number>> = {};
              allPayments.forEach((p: any) => {
                if (!p.student_id || !p.semester) return;
                if (!semPayMap[p.student_id]) semPayMap[p.student_id] = {};
                semPayMap[p.student_id][p.semester] = (semPayMap[p.student_id][p.semester] || 0) + Number(p.amount);
              });
              return students.filter((s: any) => {
                const curSem = s.semester || 1;
                const hasCurrentSemesterFee = semFeeMap[s.id]?.[curSem] !== undefined;
                if (!hasCurrentSemesterFee) return false;
                const curSemFee = Number(semFeeMap[s.id][curSem] || 0);
                if (curSemFee <= 0) return false;
                const curSemPaid = Number(semPayMap[s.id]?.[curSem] || 0);
                return curSemPaid < curSemFee;
              }).length;
            })()} student(s)
          </span>
        </div>
        {(() => {
          // Build per-student, per-semester fee/payment maps
          const semFeeMap: Record<string, Record<number, number>> = {};
          allSemesterFees.forEach((sf: any) => {
            if (!semFeeMap[sf.student_id]) semFeeMap[sf.student_id] = {};
            semFeeMap[sf.student_id][sf.semester] = Number(sf.fee_amount);
          });
          const semPayMap: Record<string, Record<number, number>> = {};
          allPayments.forEach((p: any) => {
            if (!p.student_id || !p.semester) return;
            if (!semPayMap[p.student_id]) semPayMap[p.student_id] = {};
            semPayMap[p.student_id][p.semester] = (semPayMap[p.student_id][p.semester] || 0) + Number(p.amount);
          });

          const defaulters = students.filter((s: any) => {
            const curSem = s.semester || 1;
            const hasCurrentSemesterFee = semFeeMap[s.id]?.[curSem] !== undefined;
            if (!hasCurrentSemesterFee) return false;
            const curSemFee = Number(semFeeMap[s.id][curSem] || 0);
            if (curSemFee <= 0) return false;
            const curSemPaid = Number(semPayMap[s.id]?.[curSem] || 0);
            return curSemPaid < curSemFee;
          });

          if (defaulters.length === 0) return (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="font-body text-sm text-muted-foreground">All current semester fees are cleared! 🎉</p>
            </div>
          );
          const bySemester: Record<number, any[]> = {};
          defaulters.forEach((s: any) => {
            const sem = s.semester || 0;
            if (!bySemester[sem]) bySemester[sem] = [];
            bySemester[sem].push(s);
          });
          return (
            <div className="divide-y divide-border/30">
              {Object.entries(bySemester).sort(([a], [b]) => Number(a) - Number(b)).map(([sem, studs]) => (
                <div key={sem}>
                  <div className="px-5 py-3 bg-muted/10 flex items-center justify-between">
                    <span className="font-body text-xs font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-3 h-3 text-[hsl(var(--gold))]" /> {Number(sem) > 0 ? `Semester ${sem}` : "No Semester"}
                    </span>
                    <span className="font-body text-[10px] text-muted-foreground">
                      {studs.length} defaulter(s) · ₹{studs.reduce((sum: number, st: any) => {
                        const curSem = st.semester || 1;
                        const curSemFee = Number(semFeeMap[st.id]?.[curSem] || 0);
                        const curSemPaid = Number(semPayMap[st.id]?.[curSem] || 0);
                        return sum + Math.max(0, curSemFee - curSemPaid);
                      }, 0).toLocaleString()} pending
                    </span>
                  </div>
                  {studs.map((s: any) => {
                    const curSem = s.semester || 1;
                    const curSemFee = Number(semFeeMap[s.id]?.[curSem] || 0);
                    const curSemPaid = Number(semPayMap[s.id]?.[curSem] || 0);
                    const curDue = Math.max(0, curSemFee - curSemPaid);
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/10 transition-colors duration-200">
                        <div className="w-9 h-9 rounded-xl bg-destructive/8 flex items-center justify-center shrink-0">
                          <IndianRupee className="w-4 h-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-semibold text-foreground truncate">{s.profile?.full_name || "—"}</p>
                          <p className="font-body text-[10px] text-muted-foreground">{s.roll_number} · {s.courses?.code || "—"} · Sem {curSem}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-body text-sm font-bold text-destructive tabular-nums">₹{curDue.toLocaleString()}</p>
                          <p className="font-body text-[10px] text-muted-foreground">of ₹{Math.round(curSemFee).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => setSelectedStudent(s)} className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary font-body text-[10px] font-semibold hover:bg-primary/20 transition-colors duration-200">Pay</button>
                          {s.profile?.phone && (
                            <a href={`tel:${s.profile.phone}`} className="p-1.5 rounded-xl hover:bg-muted/20 text-muted-foreground transition-colors duration-200"><Phone className="w-3 h-3" /></a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ─── Recent Transactions ─── */}
      {allPayments.length > 0 && (
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.08)] transition-all duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              Recent Transactions
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={receiptSearch} onChange={e => setReceiptSearch(e.target.value)}
                placeholder="Search by receipt no..."
                className={`${inputClass} pl-10 text-xs py-2`} />
            </div>
          </div>
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {allPayments.filter((p: any) => {
              if (!receiptSearch) return true;
              const q = receiptSearch.toLowerCase();
              return (p.receipt_number || "").toLowerCase().includes(q) || (p.student_name || "").toLowerCase().includes(q) || (p.student_roll || "").toLowerCase().includes(q);
            }).slice(0, 30).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/15 hover:bg-muted/25 border border-transparent hover:border-border/30 transition-all duration-300 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-body text-xs font-semibold text-foreground">{p.student_name || p.receipt_number || "—"}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{p.receipt_number}{p.student_roll ? ` · ${p.student_roll}` : ""} · {p.payment_method}{p.semester ? ` · Sem ${p.semester}` : ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-body text-sm font-bold text-emerald-400 tabular-nums">₹{Number(p.amount).toLocaleString()}</p>
                  <p className="font-body text-[10px] text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Payment Modal ─── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setSelectedStudent(null); }}>
          <div ref={paymentModalRef} className="relative bg-card/95 backdrop-blur-2xl rounded-3xl border border-border/50 w-full max-w-2xl shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent" />

            {/* Header */}
            <div className="p-6 border-b border-border/30 flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur-2xl z-10 rounded-t-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-primary/10 flex items-center justify-center border border-emerald-500/20">
                  <IndianRupee className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Record Payment</h3>
                  <p className="font-body text-xs text-primary font-semibold mt-0.5">{selectedStudent.profile?.full_name} · {selectedStudent.roll_number} · {selectedStudent.courses?.name || "—"}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="w-10 h-10 rounded-xl bg-muted/30 hover:bg-muted/60 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Fee Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Fee", value: `₹${(selectedStudent.total_fee || 0).toLocaleString()}`, icon: Wallet, color: "text-foreground", bg: "bg-muted/20", iconBg: "bg-muted/30" },
                  { label: "Paid", value: `₹${(selectedStudent.fee_paid || 0).toLocaleString()}`, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/8", iconBg: "bg-emerald-500/15" },
                  { label: "Balance Due", value: `₹${((selectedStudent.total_fee || 0) - (selectedStudent.fee_paid || 0)).toLocaleString()}`, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/8", iconBg: "bg-red-500/15" },
                ].map(({ label, value, icon: Icon, color, bg, iconBg }) => (
                  <div key={label} className={`${bg} rounded-2xl p-4 text-center border border-white/[0.04] hover:scale-[1.02] transition-transform duration-300`}>
                    <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center mx-auto mb-2`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className={`font-display text-lg font-bold ${color} tabular-nums`}>{value}</p>
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              {(() => {
                const pct = selectedStudent.total_fee ? Math.min(100, Math.round(((selectedStudent.fee_paid || 0) / selectedStudent.total_fee) * 100)) : 0;
                return (
                  <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs font-semibold text-muted-foreground">Payment Progress</span>
                      <span className={`font-display text-sm font-bold tabular-nums ${pct === 100 ? "text-emerald-400" : pct > 50 ? "text-amber-400" : "text-red-400"}`}>{pct}%</span>
                    </div>
                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                        width: `${pct}%`,
                        background: pct === 100 ? "linear-gradient(90deg, hsl(142 70% 45%), hsl(142 70% 55%))" : pct > 50 ? "linear-gradient(90deg, hsl(42 87% 45%), hsl(42 87% 55%))" : "linear-gradient(90deg, hsl(0 84% 50%), hsl(0 84% 60%))"
                      }} />
                    </div>
                  </div>
                );
              })()}

              {/* Payment History */}
              {payments.length > 0 && (
                <div className="rounded-2xl border border-border/20 overflow-hidden">
                  <div className="p-3.5 bg-muted/10 border-b border-border/20 flex items-center justify-between">
                    <h4 className="font-body text-xs font-bold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Recent Payments
                    </h4>
                    <span className="font-body text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{payments.length} records</span>
                  </div>
                  <div className="divide-y divide-border/10 max-h-36 overflow-y-auto">
                    {payments.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center px-4 py-2.5 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <IndianRupee className="w-3 h-3 text-emerald-400" />
                          </div>
                          <div>
                            <span className="font-body text-xs font-bold text-emerald-400 tabular-nums">₹{Number(p.amount).toLocaleString()}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-body text-[10px] text-muted-foreground">{p.payment_method}</span>
                              {p.semester && <span className="text-[9px] px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold">Sem {p.semester}</span>}
                              {p.receipt_number && <span className="text-[9px] px-1.5 py-0.5 rounded-lg bg-muted/30 text-muted-foreground">{p.receipt_number}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="font-body text-[10px] text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Form */}
              <div className="rounded-2xl border border-border/20 p-5 bg-muted/5">
                <h4 className="font-body text-xs font-bold text-foreground uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> New Payment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Amount (₹) *</label>
                    <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className={inputClass} placeholder="Enter amount" min="1" />
                  </div>
                  <div>
                    <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Semester</label>
                    <select value={paymentForm.semester} onChange={e => setPaymentForm({ ...paymentForm, semester: e.target.value })} className={inputClass}>
                      <option value="">Current ({selectedStudent?.semester || "—"})</option>
                      {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Payment Method</label>
                    <select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value, upi_number: "" })} className={inputClass}>
                      {["Cash", "Online", "Cheque", "UPI", "DD"].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  {(paymentForm.payment_method === "Online" || paymentForm.payment_method === "UPI") ? (
                    <div>
                      <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">UPI / Txn Number</label>
                      <input value={paymentForm.upi_number} onChange={e => setPaymentForm({ ...paymentForm, upi_number: e.target.value })}
                        className={inputClass} placeholder="Enter UPI ID or txn no." />
                    </div>
                  ) : (
                    <div>
                      <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Remarks</label>
                      <input value={paymentForm.remarks} onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                        className={inputClass} placeholder="Optional notes..." />
                    </div>
                  )}
                </div>
                {(paymentForm.payment_method === "Online" || paymentForm.payment_method === "UPI") && (
                  <div className="mt-4">
                    <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Remarks</label>
                    <input value={paymentForm.remarks} onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                      className={inputClass} placeholder="Optional notes..." />
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons */}
              {selectedStudent.total_fee && (selectedStudent.total_fee - (selectedStudent.fee_paid || 0)) > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Quick:</span>
                  {[
                    { label: "Full Due", amount: (selectedStudent.total_fee || 0) - (selectedStudent.fee_paid || 0) },
                    { label: "Half Due", amount: Math.round(((selectedStudent.total_fee || 0) - (selectedStudent.fee_paid || 0)) / 2) },
                    ...[5000, 10000, 25000].filter(a => a <= ((selectedStudent.total_fee || 0) - (selectedStudent.fee_paid || 0))).map(a => ({ label: `₹${(a/1000)}K`, amount: a })),
                  ].map(({ label, amount }) => (
                    <button key={label} onClick={() => setPaymentForm(f => ({ ...f, amount: String(amount) }))}
                      className={`px-3 py-1.5 rounded-xl font-body text-[10px] font-bold border transition-all duration-200 hover:scale-105 ${
                        paymentForm.amount === String(amount) 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border/30 bg-muted/10 text-muted-foreground hover:border-primary/30"
                      }`}>
                      {label} <span className="text-[9px] opacity-70 ml-0.5">₹{amount.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-card/95 backdrop-blur-2xl pb-1">
                <Button variant="outline" onClick={() => setSelectedStudent(null)} className="flex-1 rounded-xl font-body border-border/40 h-12 text-sm">Cancel</Button>
                <Button onClick={() => recordPayment.mutate()} disabled={!paymentForm.amount || recordPayment.isPending} className="flex-1 rounded-xl font-body bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 h-12 text-sm">
                  {recordPayment.isPending ? (
                    <><Clock className="w-4 h-4 mr-1.5 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-1.5" /> Record Payment</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Fee Edit Modal ─── */}
      {feeEditStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative bg-card/95 backdrop-blur-2xl rounded-3xl border border-border/50 w-full max-w-lg shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/15 to-transparent" />
            <div className="p-6 border-b border-border/30 flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur-2xl z-10 rounded-t-3xl">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Edit Fee Details</h3>
                <p className="font-body text-xs text-primary font-semibold mt-0.5">{feeEditStudent.profile?.full_name} · {feeEditStudent.roll_number}</p>
              </div>
              <button onClick={() => setFeeEditStudent(null)} className="w-8 h-8 rounded-xl bg-muted/30 hover:bg-muted/60 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-1.5 p-1 bg-muted/20 rounded-xl border border-border/30">
                <button onClick={() => setFeeEditMode("total")}
                  className={`flex-1 py-2.5 rounded-lg font-body text-xs font-semibold transition-all duration-300 ${feeEditMode === "total" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
                  Yearly Fee
                </button>
                <button onClick={() => setFeeEditMode("semester")}
                  className={`flex-1 py-2.5 rounded-lg font-body text-xs font-semibold transition-all duration-300 ${feeEditMode === "semester" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
                  Semester-wise Fee
                </button>
              </div>

              {feeEditMode === "total" ? (
                <div>
                  <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Yearly Fee (₹)</label>
                  <input type="number" value={feeEditForm.total_fee} onChange={e => setFeeEditForm({ ...feeEditForm, total_fee: e.target.value })}
                    className={inputClass} placeholder="Yearly fee amount" />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-body text-xs text-muted-foreground">Set fee for each semester. Total will be auto-calculated.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(sem => (
                      <div key={sem}>
                        <label className="font-body text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider">Semester {sem}</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-xs text-muted-foreground">₹</span>
                          <input type="number" value={feeEditSemFees[sem] || ""} onChange={e => setFeeEditSemFees(prev => ({ ...prev, [sem]: e.target.value }))}
                            className={`${inputClass} pl-7`} placeholder="0" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex items-center justify-between">
                    <span className="font-body text-xs font-semibold text-foreground">Auto-calculated Total</span>
                    <span className="font-display text-lg font-bold text-primary tabular-nums">
                      ₹{Object.values(feeEditSemFees).reduce((sum, v) => sum + (parseFloat(v) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Due Date</label>
                <input type="date" value={feeEditForm.fee_due_date} onChange={e => setFeeEditForm({ ...feeEditForm, fee_due_date: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Remarks</label>
                <input value={feeEditForm.fee_remarks} onChange={e => setFeeEditForm({ ...feeEditForm, fee_remarks: e.target.value })}
                  className={inputClass} placeholder="Fee remarks..." />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setFeeEditStudent(null)} className="flex-1 rounded-xl font-body border-border/40">Cancel</Button>
                <Button onClick={() => updateFee.mutate()} disabled={updateFee.isPending} className="flex-1 rounded-xl font-body bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 shadow-lg shadow-primary/20">
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Dialog ─── */}
      <Dialog open={!!receiptPayment} onOpenChange={() => setReceiptPayment(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-emerald-400" />
              </div>
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          {receiptPayment && (
            <div className="space-y-5 mt-3">
              <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-2xl p-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="font-display text-3xl font-bold text-emerald-400 tabular-nums">₹{Number(receiptPayment.amount).toLocaleString()}</p>
                <p className="font-body text-xs text-muted-foreground mt-2">Payment Recorded Successfully</p>
              </div>
              <div className="space-y-2.5 bg-muted/10 rounded-xl p-4 border border-border/30">
                {[
                  { label: "Receipt No", value: receiptPayment.receipt_number },
                  { label: "Student", value: receiptPayment.student_name },
                  { label: "Roll No", value: receiptPayment.roll_number },
                  { label: "Course", value: receiptPayment.course },
                  { label: "Semester", value: receiptPayment.semester ? `Semester ${receiptPayment.semester}` : "—" },
                  { label: "Method", value: receiptPayment.payment_method },
                  { label: "Date", value: format(new Date(receiptPayment.created_at), "dd MMM yyyy, hh:mm a") },
                  ...(receiptPayment.remarks ? [{ label: "Remarks", value: receiptPayment.remarks }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between font-body text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {/* Remaining Fee & Cleared Semester Status */}
              {(() => {
                const stu = students.find((s: any) => s.id === receiptPayment.student_id);
                if (!stu) return null;
                const stuSemFees = allSemesterFees.filter((sf: any) => sf.student_id === stu.id);
                const stuPayments = allPayments.filter((p: any) => p.student_id === stu.id);
                if (stuSemFees.length === 0) return null;
                return (
                  <div className="bg-muted/10 rounded-xl p-4 border border-border/30 space-y-2">
                    <p className="font-body text-[11px] font-bold text-foreground uppercase tracking-wider">Semester Fee Status</p>
                    {stuSemFees.map((sf: any) => {
                      const semPaid = stuPayments.filter((p: any) => p.semester === sf.semester).reduce((s: number, p: any) => s + Number(p.amount), 0);
                      const due = Math.max(0, Number(sf.fee_amount) - semPaid);
                      const isCleared = due <= 0;
                      return (
                        <div key={sf.semester} className="flex justify-between items-center font-body text-xs">
                          <span className="text-muted-foreground">Semester {sf.semester}</span>
                          {isCleared ? (
                            <span className="font-semibold text-emerald-500">✅ Cleared</span>
                          ) : (
                            <span className="font-semibold text-destructive">₹{due.toLocaleString()} remaining</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <Button onClick={printReceipt} className="w-full rounded-xl font-body bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 shadow-lg shadow-primary/20">
                <Printer className="w-4 h-4 mr-2" /> Print / Download Receipt
              </Button>
              <Button variant="outline" onClick={() => setReceiptPayment(null)} className="w-full rounded-xl font-body border-border/40">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}
