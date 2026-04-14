import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { IndianRupee, Wallet, ArrowLeft, Calendar, CreditCard, Receipt, Download, FileText, Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";

export default function StudentFees() {
  const { user } = useAuth();
  const [summaryFilter, setSummaryFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("current");
  const [semFilter, setSemFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["student-fee-details", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: student } = await supabase
        .from("students")
        .select("id, total_fee, fee_paid, fee_due_date, fee_remarks, semester, roll_number, course_id, courses(name, code)")
        .eq("user_id", user.id)
        .single();
      if (!student) return null;
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      const { data: semFees } = await supabase
        .from("semester_fees")
        .select("*")
        .eq("student_id", student.id)
        .order("semester", { ascending: true });
      return { student, payments: payments || [], semesterFees: semFees || [] };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <IndianRupee className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-body text-muted-foreground">No fee data available.</p>
      </div>
    );
  }

  const { student, payments, semesterFees: semFeeRecords } = data;
  const totalFee = student.total_fee || 0;
  const feePaid = student.fee_paid || 0;
  const feeRemaining = Math.max(0, totalFee - feePaid);
  const pct = totalFee > 0 ? Math.round((feePaid / totalFee) * 100) : 0;
  const currentSemester = student.semester || 1;

  // Semester-wise payment totals
  const semPayments: Record<number, number> = {};
  payments.forEach((p: any) => {
    const s = p.semester || 1;
    semPayments[s] = (semPayments[s] || 0) + Number(p.amount);
  });

  // Per-semester fee from semester_fees table, fallback to even split
  const semFeeMap: Record<number, number> = {};
  semFeeRecords.forEach((sf: any) => { semFeeMap[sf.semester] = Number(sf.fee_amount); });
  const hasSemFees = semFeeRecords.length > 0;
  const getPerSemFee = (sem: number) => semFeeMap[sem] ?? (totalFee > 0 ? Math.round(totalFee / 6) : 0);
  const perSemFee = getPerSemFee(currentSemester);
  const currentSemPaid = semPayments[currentSemester] || 0;
  const currentSemRemaining = Math.max(0, perSemFee - currentSemPaid);
  const currentSemPct = perSemFee > 0 ? Math.round((currentSemPaid / perSemFee) * 100) : 0;

  // Summary filter logic
  const summaryTotalFee = summaryFilter === "all" ? totalFee : getPerSemFee(Number(summaryFilter));
  const summaryPaid = summaryFilter === "all" ? feePaid : (semPayments[Number(summaryFilter)] || 0);
  const summaryRemaining = Math.max(0, summaryTotalFee - summaryPaid);
  const summaryPaymentsCount = summaryFilter === "all" ? payments.length : payments.filter((p: any) => String(p.semester || 1) === summaryFilter).length;

  // Filter payments
  const filteredPayments = payments.filter((p: any) => {
    const matchSem = semFilter === "all" || String(p.semester) === semFilter;
    const matchMethod = methodFilter === "all" || p.payment_method === methodFilter;
    const pDate = new Date(p.created_at);
    const matchFrom = !dateFrom || pDate >= new Date(dateFrom);
    const matchTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
    return matchSem && matchMethod && matchFrom && matchTo;
  });

  const filteredTotal = filteredPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  // Payment method stats
  const methodStats = payments.reduce((acc: Record<string, number>, p: any) => {
    acc[p.payment_method || "Cash"] = (acc[p.payment_method || "Cash"] || 0) + Number(p.amount);
    return acc;
  }, {});

  // Semester-wise stats
  const semStats = payments.reduce((acc: Record<number, number>, p: any) => {
    const s = p.semester || 1;
    acc[s] = (acc[s] || 0) + Number(p.amount);
    return acc;
  }, {});

  const uniqueMethods = [...new Set(payments.map((p: any) => p.payment_method || "Cash"))];

  const clearFilters = () => {
    setSemFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = semFilter !== "all" || methodFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-3 py-1 mb-2">
              <IndianRupee className="w-3 h-3 text-emerald-600" />
              <span className="font-body text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Fee Details</span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Fee Structure & Payments</h2>
            <p className="font-body text-sm text-muted-foreground mt-1">
              {(student as any).courses?.name || "—"} · Semester {student.semester || "—"} · {student.roll_number}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Semester Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-body text-xs font-semibold text-foreground">Fee Summary:</span>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setSummaryFilter("all")}
            className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold border transition-all duration-200 ${summaryFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
            Overall
          </button>
          {[1,2,3,4,5,6].map(s => (
            <button key={s} onClick={() => setSummaryFilter(String(s))}
              className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold border transition-all duration-200 ${summaryFilter === String(s) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"} ${s === currentSemester ? "ring-1 ring-primary/30" : ""}`}>
              Sem {s} {s === currentSemester ? "•" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: summaryFilter === "all" ? "Yearly Fee" : `Sem ${summaryFilter} Fee`, value: `₹${summaryTotalFee.toLocaleString()}`, icon: IndianRupee, color: "text-foreground", bg: "bg-primary/5" },
          { label: "Amount Paid", value: `₹${summaryPaid.toLocaleString()}`, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/5" },
          { label: "Remaining", value: summaryRemaining > 0 ? `₹${summaryRemaining.toLocaleString()}` : "✓ Cleared", icon: summaryRemaining > 0 ? AlertCircle : CheckCircle, color: summaryRemaining > 0 ? "text-destructive" : "text-emerald-600", bg: summaryRemaining > 0 ? "bg-destructive/5" : "bg-emerald-500/5" },
          { label: "Payments", value: String(summaryPaymentsCount), icon: Receipt, color: "text-primary", bg: "bg-primary/5" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-border/60 rounded-2xl p-4 hover:shadow-md transition-all duration-300`}>
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className={`font-display text-lg font-bold ${color} tabular-nums`}>{value}</p>
            <p className="font-body text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</p>
          </div>
        ))}

        {/* Current Semester Remaining Box */}
        <div className={`border rounded-2xl p-4 hover:shadow-md transition-all duration-300 ${currentSemRemaining > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/20"}`}>
          <Calendar className={`w-5 h-5 mb-2 ${currentSemRemaining > 0 ? "text-amber-600" : "text-emerald-600"}`} />
          <p className={`font-display text-lg font-bold tabular-nums ${currentSemRemaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {currentSemRemaining > 0 ? `₹${currentSemRemaining.toLocaleString()}` : "✓ Paid"}
          </p>
          <p className="font-body text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Sem {currentSemester} Due</p>
          <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${Math.min(currentSemPct, 100)}%`,
              background: currentSemPct >= 100 ? "hsl(142, 70%, 40%)" : "hsl(42, 87%, 55%)"
            }} />
          </div>
        </div>
      </div>

      {/* Progress Bar with Semester Filter */}
      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="font-body text-sm font-semibold text-foreground">Payment Progress</span>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setProgressFilter("current")}
              className={`px-2.5 py-1 rounded-full font-body text-[10px] font-semibold border transition-all duration-200 ${progressFilter === "current" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
              Sem {currentSemester} (Current)
            </button>
            <button onClick={() => setProgressFilter("all")}
              className={`px-2.5 py-1 rounded-full font-body text-[10px] font-semibold border transition-all duration-200 ${progressFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
              Overall
            </button>
            {[1,2,3,4,5,6].filter(s => s !== currentSemester).map(s => (
              <button key={s} onClick={() => setProgressFilter(String(s))}
                className={`px-2.5 py-1 rounded-full font-body text-[10px] font-semibold border transition-all duration-200 ${progressFilter === String(s) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
                Sem {s}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const progFee = progressFilter === "all" ? totalFee : progressFilter === "current" ? perSemFee : getPerSemFee(Number(progressFilter));
          const progPaid = progressFilter === "all" ? feePaid : progressFilter === "current" ? currentSemPaid : (semPayments[Number(progressFilter)] || 0);
          const progRemaining = Math.max(0, progFee - progPaid);
          const progPct = progFee > 0 ? Math.round((progPaid / progFee) * 100) : 0;
          const label = progressFilter === "all" ? "Overall" : progressFilter === "current" ? `Semester ${currentSemester}` : `Semester ${progressFilter}`;

          return (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body text-xs text-muted-foreground">{label}</span>
                <span className="font-body text-xs font-bold text-foreground tabular-nums">{progPct}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                  width: `${progPct}%`,
                  background: progPct === 100 ? "hsl(142, 70%, 40%)" : progPct > 50 ? "hsl(42, 87%, 55%)" : "hsl(0, 84%, 60%)"
                }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-body text-[11px] text-muted-foreground">
                  Paid: <span className="font-semibold text-emerald-600">₹{progPaid.toLocaleString()}</span>
                </span>
                <span className="font-body text-[11px] text-muted-foreground">
                  {progRemaining > 0
                    ? <>Due: <span className="font-semibold text-destructive">₹{progRemaining.toLocaleString()}</span></>
                    : <span className="font-semibold text-emerald-600">✓ Fully Paid</span>}
                </span>
              </div>
            </>
          );
        })()}

        {student.fee_due_date && (
          <p className="font-body text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            Due by: <span className="font-semibold">{format(new Date(student.fee_due_date), "dd MMM yyyy")}</span>
            {new Date(student.fee_due_date) < new Date() && feeRemaining > 0 && (
              <span className="text-destructive font-bold ml-2">⚠ Overdue</span>
            )}
          </p>
        )}
        {student.fee_remarks && (
          <p className="font-body text-[11px] text-muted-foreground mt-1">Remarks: {student.fee_remarks}</p>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Payment Method Breakdown */}
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <h3 className="font-body text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> By Payment Method
          </h3>
          {Object.keys(methodStats).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(methodStats).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <span className="font-body text-xs text-muted-foreground">{method}</span>
                  <span className="font-body text-sm font-bold text-foreground tabular-nums">₹{Number(amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="font-body text-xs text-muted-foreground text-center py-4">No payments yet</p>}
        </div>

        {/* Semester-wise Fee Structure */}
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <h3 className="font-body text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Semester-wise Fee & Payments
          </h3>
          {hasSemFees ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].filter(s => semFeeMap[s]).map(sem => {
                const fee = semFeeMap[sem] || 0;
                const paid = semPayments[sem] || 0;
                const due = Math.max(0, fee - paid);
                const semPct = fee > 0 ? Math.round((paid / fee) * 100) : 0;
                return (
                  <div key={sem} className="p-3 rounded-xl bg-muted/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs font-semibold text-foreground">Semester {sem} {sem === currentSemester ? <span className="text-primary">(Current)</span> : ""}</span>
                      <span className="font-body text-[11px] text-muted-foreground">Fee: ₹{fee.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(semPct, 100)}%`, background: semPct >= 100 ? "hsl(142, 70%, 40%)" : "hsl(42, 87%, 55%)" }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-[10px] text-emerald-600 tabular-nums">Paid: ₹{paid.toLocaleString()}</span>
                      <span className={`font-body text-[10px] tabular-nums ${due > 0 ? "text-destructive" : "text-emerald-600"}`}>{due > 0 ? `Due: ₹${due.toLocaleString()}` : "✓ Cleared"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : Object.keys(semStats).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(semStats).sort(([a], [b]) => Number(a) - Number(b)).map(([sem, amount]) => (
                <div key={sem} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <span className="font-body text-xs text-muted-foreground">Semester {sem}</span>
                  <span className="font-body text-sm font-bold text-foreground tabular-nums">₹{Number(amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="font-body text-xs text-muted-foreground text-center py-4">No fee structure set yet</p>}
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-card border border-border/60 rounded-2xl p-4">
        <h3 className="font-body text-xs font-semibold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Filter Payment History
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={semFilter} onChange={e => setSemFilter(e.target.value)}
            className="font-body text-xs border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-auto">
            <option value="all">All Semesters</option>
            {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
          </select>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
            className="font-body text-xs border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-auto">
            <option value="all">All Methods</option>
            {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="font-body text-xs border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="font-body text-xs border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="To" />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl font-body text-xs">
              Clear Filters
            </Button>
          )}
        </div>
        {hasFilters && (
          <p className="font-body text-[10px] text-muted-foreground mt-2">
            Showing {filteredPayments.length} of {payments.length} payments · Filtered total: ₹{filteredTotal.toLocaleString()}
          </p>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-body text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Payment History
          </h3>
        </div>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">
              {hasFilters ? "No payments match your filters" : "No payments recorded yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredPayments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold text-emerald-600 tabular-nums">₹{Number(p.amount).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-body text-[10px] px-2 py-0.5 rounded-lg bg-muted/50 text-muted-foreground">{p.payment_method || "Cash"}</span>
                      {p.semester && <span className="font-body text-[10px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary">Sem {p.semester}</span>}
                      {p.receipt_number && <span className="font-body text-[10px] text-muted-foreground">{p.receipt_number}</span>}
                    </div>
                    {p.remarks && <p className="font-body text-[10px] text-muted-foreground mt-0.5">{p.remarks}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-body text-xs text-muted-foreground">{format(new Date(p.created_at), "dd MMM yyyy")}</p>
                  <p className="font-body text-[10px] text-muted-foreground/60">{format(new Date(p.created_at), "hh:mm a")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
