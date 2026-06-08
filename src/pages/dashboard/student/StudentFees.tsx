import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  IndianRupee, Wallet, Calendar, CreditCard, Receipt, FileText, Clock,
  CheckCircle, AlertCircle, TrendingUp, HelpCircle, Sparkles, Shield, Info, GraduationCap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const InfoTip = ({ text }: { text: string }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center text-muted-foreground/60 hover:text-primary transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] font-body text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

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
        <Skeleton className="h-32 rounded-[2rem]" />
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

  const semPayments: Record<number, number> = {};
  payments.forEach((p: any) => {
    const s = p.semester || 1;
    semPayments[s] = (semPayments[s] || 0) + Number(p.amount);
  });

  const semFeeMap: Record<number, number> = {};
  semFeeRecords.forEach((sf: any) => { semFeeMap[sf.semester] = Number(sf.fee_amount); });
  const hasSemFees = semFeeRecords.length > 0;
  const getPerSemFee = (sem: number) => semFeeMap[sem] ?? (totalFee > 0 ? Math.round(totalFee / 6) : 0);
  const perSemFee = getPerSemFee(currentSemester);
  const currentSemPaid = semPayments[currentSemester] || 0;
  const currentSemRemaining = Math.max(0, perSemFee - currentSemPaid);
  const currentSemPct = perSemFee > 0 ? Math.round((currentSemPaid / perSemFee) * 100) : 0;

  const summaryTotalFee = summaryFilter === "all" ? totalFee : getPerSemFee(Number(summaryFilter));
  const summaryPaid = summaryFilter === "all" ? feePaid : (semPayments[Number(summaryFilter)] || 0);
  const summaryRemaining = Math.max(0, summaryTotalFee - summaryPaid);
  const summaryPaymentsCount = summaryFilter === "all" ? payments.length : payments.filter((p: any) => String(p.semester || 1) === summaryFilter).length;

  const filteredPayments = payments.filter((p: any) => {
    const matchSem = semFilter === "all" || String(p.semester) === semFilter;
    const matchMethod = methodFilter === "all" || p.payment_method === methodFilter;
    const pDate = new Date(p.created_at);
    const matchFrom = !dateFrom || pDate >= new Date(dateFrom);
    const matchTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
    return matchSem && matchMethod && matchFrom && matchTo;
  });

  const filteredTotal = filteredPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  const methodStats = payments.reduce((acc: Record<string, number>, p: any) => {
    acc[p.payment_method || "Cash"] = (acc[p.payment_method || "Cash"] || 0) + Number(p.amount);
    return acc;
  }, {});

  const semStats = payments.reduce((acc: Record<number, number>, p: any) => {
    const s = p.semester || 1;
    acc[s] = (acc[s] || 0) + Number(p.amount);
    return acc;
  }, {});

  const uniqueMethods = [...new Set(payments.map((p: any) => p.payment_method || "Cash"))];

  const clearFilters = () => {
    setSemFilter("all"); setMethodFilter("all"); setDateFrom(""); setDateTo("");
  };
  const hasFilters = semFilter !== "all" || methodFilter !== "all" || dateFrom || dateTo;

  // Chart data
  const donutData = [
    { name: "Paid", value: summaryPaid },
    { name: "Remaining", value: summaryRemaining },
  ];
  const DONUT_COLORS = ["hsl(142, 70%, 45%)", "hsl(0, 70%, 60%)"];

  const semChartData = [1,2,3,4,5,6].map(s => ({
    sem: `S${s}`,
    Fee: getPerSemFee(s),
    Paid: semPayments[s] || 0,
  }));

  const METHOD_COLORS = ["hsl(217, 91%, 60%)", "hsl(280, 65%, 60%)", "hsl(35, 95%, 55%)", "hsl(160, 70%, 45%)", "hsl(340, 75%, 55%)"];
  const methodEntries = Object.entries(methodStats);
  const methodTotal = methodEntries.reduce((s, [, v]) => s + Number(v), 0);

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Premium Hero */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-primary/15 via-card to-emerald-500/10 p-6 shadow-lg">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />

        <div className="relative flex items-start gap-3 mb-5">
          <BackButton />
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 mb-2 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span className="font-body text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">Premium Fee Hub</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Fee Structure & Payments</h2>
            <p className="font-body text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              {(student as any).courses?.name || "—"} · Semester {student.semester || "—"} · {student.roll_number}
            </p>
          </div>
        </div>

        {/* Hero stat ribbon */}
        <div className="relative grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-background/60 backdrop-blur-md border border-border/60 p-3">
            <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="font-display text-base sm:text-lg font-bold text-foreground tabular-nums mt-0.5">₹{totalFee.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 p-3">
            <p className="font-body text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Paid</p>
            <p className="font-display text-base sm:text-lg font-bold text-emerald-600 tabular-nums mt-0.5">₹{feePaid.toLocaleString()}</p>
          </div>
          <div className={`rounded-2xl backdrop-blur-md border p-3 ${feeRemaining > 0 ? "bg-destructive/10 border-destructive/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <p className={`font-body text-[10px] uppercase tracking-wider ${feeRemaining > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>Remaining</p>
            <p className={`font-display text-base sm:text-lg font-bold tabular-nums mt-0.5 ${feeRemaining > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {feeRemaining > 0 ? `₹${feeRemaining.toLocaleString()}` : "✓ Cleared"}
            </p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-body text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              Overall Progress <InfoTip text="Percentage of your total program fee that has been paid so far." />
            </span>
            <span className="font-display text-sm font-bold text-foreground tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 bg-background/50 rounded-full overflow-hidden border border-border/40">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-500 via-emerald-400 to-primary"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-body text-xs font-semibold text-foreground flex items-center gap-1">
          Fee Summary <InfoTip text="Switch between yearly and per-semester totals to drill into your fee structure." />:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setSummaryFilter("all")}
            className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold border transition-all duration-200 ${summaryFilter === "all" ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
            Overall
          </button>
          {[1,2,3,4,5,6].map(s => (
            <button key={s} onClick={() => setSummaryFilter(String(s))}
              className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold border transition-all duration-200 ${summaryFilter === String(s) ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-card border-border text-muted-foreground hover:bg-muted"} ${s === currentSemester ? "ring-1 ring-primary/30" : ""}`}>
              Sem {s} {s === currentSemester ? "•" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Donut + Summary cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Donut chart */}
        <div className="lg:col-span-1 bg-card border border-border/60 rounded-[2rem] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="relative">
            <h3 className="font-body text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              {summaryFilter === "all" ? "Overall Breakdown" : `Semester ${summaryFilter}`}
              <InfoTip text="Visual split of paid amount vs remaining balance for the selected scope." />
            </h3>
            <p className="font-body text-[10px] text-muted-foreground mb-3">Paid vs Remaining</p>
            <div className="relative h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={summaryRemaining > 0 && summaryPaid > 0 ? 4 : 0}
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={3}
                  >
                    {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-display text-2xl font-bold text-foreground tabular-nums">
                  {summaryTotalFee > 0 ? Math.round((summaryPaid / summaryTotalFee) * 100) : 0}%
                </span>
                <span className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Paid</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-center">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-body text-[10px] text-muted-foreground uppercase">Paid</span>
                </div>
                <p className="font-display text-sm font-bold text-emerald-600 tabular-nums">₹{summaryPaid.toLocaleString()}</p>
              </div>
              <div className={`rounded-xl border p-2 ${summaryRemaining > 0 ? "bg-destructive/10 border-destructive/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${summaryRemaining > 0 ? "bg-destructive" : "bg-emerald-500"}`} />
                  <span className="font-body text-[10px] text-muted-foreground uppercase">Due</span>
                </div>
                <p className={`font-display text-sm font-bold tabular-nums ${summaryRemaining > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {summaryRemaining > 0 ? `₹${summaryRemaining.toLocaleString()}` : "✓"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-3">
          {[
            { label: summaryFilter === "all" ? "Yearly Fee" : `Sem ${summaryFilter} Fee`, value: `₹${summaryTotalFee.toLocaleString()}`, icon: IndianRupee, color: "text-foreground", bg: "from-primary/10 to-primary/5", ring: "ring-primary/20" },
            { label: "Amount Paid", value: `₹${summaryPaid.toLocaleString()}`, icon: CheckCircle, color: "text-emerald-600", bg: "from-emerald-500/15 to-emerald-500/5", ring: "ring-emerald-500/20" },
            { label: "Remaining", value: summaryRemaining > 0 ? `₹${summaryRemaining.toLocaleString()}` : "✓ Cleared", icon: summaryRemaining > 0 ? AlertCircle : CheckCircle, color: summaryRemaining > 0 ? "text-destructive" : "text-emerald-600", bg: summaryRemaining > 0 ? "from-destructive/15 to-destructive/5" : "from-emerald-500/15 to-emerald-500/5", ring: summaryRemaining > 0 ? "ring-destructive/20" : "ring-emerald-500/20" },
            { label: "Payments", value: String(summaryPaymentsCount), icon: Receipt, color: "text-primary", bg: "from-primary/15 to-primary/5", ring: "ring-primary/20" },
          ].map(({ label, value, icon: Icon, color, bg, ring }) => (
            <div key={label} className={`group relative bg-gradient-to-br ${bg} border border-border/60 rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 ${ring} transition-all duration-300 overflow-hidden`}>
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5 blur-xl group-hover:bg-white/10 transition-all" />
              <Icon className={`w-5 h-5 ${color} mb-2 relative`} />
              <p className={`font-display text-lg font-bold ${color} tabular-nums relative`}>{value}</p>
              <p className="font-body text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider relative">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Current Semester Card with progress */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 ${currentSemRemaining > 0 ? "bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 border-amber-500/30" : "bg-gradient-to-r from-emerald-500/10 via-card to-emerald-500/5 border-emerald-500/30"}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentSemRemaining > 0 ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>
              <Calendar className={`w-6 h-6 ${currentSemRemaining > 0 ? "text-amber-600" : "text-emerald-600"}`} />
            </div>
            <div>
              <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">Current — Semester {currentSemester}</p>
              <p className={`font-display text-xl font-bold tabular-nums ${currentSemRemaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {currentSemRemaining > 0 ? `₹${currentSemRemaining.toLocaleString()} Due` : "✓ Fully Paid"}
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-body text-[10px] text-muted-foreground">Paid ₹{currentSemPaid.toLocaleString()} of ₹{perSemFee.toLocaleString()}</span>
              <span className="font-body text-[10px] font-bold tabular-nums">{currentSemPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                width: `${Math.min(currentSemPct, 100)}%`,
                background: currentSemPct >= 100 ? "linear-gradient(90deg, hsl(142,70%,45%), hsl(142,70%,55%))" : "linear-gradient(90deg, hsl(42,90%,55%), hsl(35,95%,60%))"
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar with Semester Filter */}
      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="font-body text-sm font-semibold text-foreground flex items-center gap-1.5">
            Payment Progress <InfoTip text="See progress for the current semester, the whole program, or any specific semester." />
          </span>
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
                  background: progPct === 100
                    ? "linear-gradient(90deg, hsl(142,70%,40%), hsl(160,70%,50%))"
                    : progPct > 50
                      ? "linear-gradient(90deg, hsl(42,87%,55%), hsl(35,95%,60%))"
                      : "linear-gradient(90deg, hsl(0,84%,60%), hsl(15,90%,60%))"
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

      {/* Semester-wise chart */}
      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <h3 className="font-body text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Semester-wise Fee vs Paid
          <InfoTip text="Compare each semester's fee against payments made so far." />
        </h3>
        <p className="font-body text-[10px] text-muted-foreground mb-3">Hover bars for exact amounts</p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="sem" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
              />
              <Bar dataKey="Fee" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} opacity={0.35} />
              <Bar dataKey="Paid" fill="hsl(142, 70%, 45%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Payment Method Breakdown with visual bars */}
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <h3 className="font-body text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> By Payment Method
            <InfoTip text="Distribution of your payments across the different methods used." />
          </h3>
          {methodEntries.length > 0 ? (
            <div className="space-y-2.5">
              {methodEntries.map(([method, amount], i) => {
                const share = methodTotal > 0 ? (Number(amount) / methodTotal) * 100 : 0;
                const color = METHOD_COLORS[i % METHOD_COLORS.length];
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="font-body text-xs text-foreground font-medium">{method}</span>
                      </div>
                      <span className="font-body text-xs font-bold text-foreground tabular-nums">
                        ₹{Number(amount).toLocaleString()} <span className="text-muted-foreground font-normal">· {share.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="font-body text-xs text-muted-foreground text-center py-4">No payments yet</p>}
        </div>

        {/* Semester-wise Fee Structure */}
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <h3 className="font-body text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Semester Fee Status
            <InfoTip text="Detailed paid/due status for every semester in your program." />
          </h3>
          {hasSemFees ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].filter(s => semFeeMap[s]).map(sem => {
                const fee = semFeeMap[sem] || 0;
                const paid = semPayments[sem] || 0;
                const due = Math.max(0, fee - paid);
                const semPct = fee > 0 ? Math.round((paid / fee) * 100) : 0;
                return (
                  <div key={sem} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors space-y-1.5">
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
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
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
            className="font-body text-xs border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="font-body text-xs border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
            <span className="ml-auto font-body text-[10px] text-muted-foreground font-normal">{filteredPayments.length} {filteredPayments.length === 1 ? "entry" : "entries"}</span>
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

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border/60 rounded-[2rem] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Frequently Asked Questions</h3>
            <p className="font-body text-[11px] text-muted-foreground">Quick answers about fees & payments</p>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="q1" className="border-border/60">
            <AccordionTrigger className="font-body text-sm hover:no-underline">How are my fees calculated?</AccordionTrigger>
            <AccordionContent className="font-body text-xs text-muted-foreground">
              Your fees are set per semester by the administration. The total program fee is the sum of all six semesters and may vary based on your course and category.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2" className="border-border/60">
            <AccordionTrigger className="font-body text-sm hover:no-underline">What payment methods are accepted?</AccordionTrigger>
            <AccordionContent className="font-body text-xs text-muted-foreground">
              We currently accept Cash, UPI, Bank Transfer, Cheque, and Card payments at the college office. Each payment is recorded with a unique receipt number.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q3" className="border-border/60">
            <AccordionTrigger className="font-body text-sm hover:no-underline">When is my fee due?</AccordionTrigger>
            <AccordionContent className="font-body text-xs text-muted-foreground">
              The due date set by the administration appears under "Payment Progress". A red "Overdue" badge will appear if payment is past due and the balance is unpaid.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q4" className="border-border/60">
            <AccordionTrigger className="font-body text-sm hover:no-underline">Can I get a receipt for my payment?</AccordionTrigger>
            <AccordionContent className="font-body text-xs text-muted-foreground">
              Yes. Every payment in the "Payment History" section has a receipt number (e.g. RCP-0001). Visit the college office for a printed copy if needed.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q5" className="border-border/60">
            <AccordionTrigger className="font-body text-sm hover:no-underline">Whom do I contact for fee discrepancies?</AccordionTrigger>
            <AccordionContent className="font-body text-xs text-muted-foreground">
              For any concerns, please reach out to the accounts office or use the Feedback section in your dashboard. Discrepancies are typically resolved within 2-3 working days.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q6" className="border-none">
            <AccordionTrigger className="font-body text-sm hover:no-underline">Is my payment information secure?</AccordionTrigger>
            <AccordionContent className="font-body text-xs text-muted-foreground flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              Yes. All financial records are encrypted in transit and at rest, and access is strictly limited to authorized staff via secure role-based controls.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
