import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  IndianRupee, Wallet, Calendar, CreditCard, Receipt, FileText, Clock,
  CheckCircle2, AlertCircle, TrendingUp, HelpCircle, Sparkles, Shield, Info,
  GraduationCap, ChevronDown, X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

/* ───────────────────────────  Design tokens  ───────────────────────────
   iOS-premium palette: gold (primary luxury), emerald (paid), rose (due).
   Absolutely no blue — enforced by project memory.                     */
const GOLD = "hsl(43 86% 58%)";
const GOLD_SOFT = "hsl(43 86% 58% / 0.18)";
const EMERALD = "hsl(152 64% 48%)";
const EMERALD_SOFT = "hsl(152 64% 48% / 0.16)";
const ROSE = "hsl(356 78% 60%)";
const ROSE_SOFT = "hsl(356 78% 60% / 0.16)";
const AMBER = "hsl(38 92% 56%)";

const METHOD_PALETTE = [GOLD, EMERALD, AMBER, "hsl(280 60% 65%)", "hsl(20 80% 60%)"];

/* ───────────────  Small reusable bits  ─────────────── */
const InfoTip = ({ text }: { text: string }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className="inline-flex items-center text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] font-body text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/* iOS segmented control */
function Segmented<T extends string>({
  value, onChange, options, ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: boolean }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex p-1 rounded-2xl bg-muted/40 dark:bg-white/[0.04] border border-border/40 backdrop-blur-xl gap-0.5 max-w-full overflow-x-auto scrollbar-none"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative shrink-0 px-3.5 py-1.5 rounded-xl font-body text-[12px] font-semibold transition-all duration-200 whitespace-nowrap ${
              active
                ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.12)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
            {o.hint && (
              <span
                className={`ml-1 inline-block w-1 h-1 rounded-full align-middle ${
                  active ? "bg-foreground/40" : "bg-foreground/30"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* iOS-style "list section" wrapper — frosted glass card */
function SectionCard({
  children, className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/70 dark:bg-white/[0.025] backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_32px_-12px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </section>
  );
}

/* iOS-style select replacement */
function IosSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none font-body text-[13px] font-medium border border-border/40 rounded-xl pl-3.5 pr-9 py-2 bg-muted/30 dark:bg-white/[0.04] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/* ────────────────────────────  Page  ──────────────────────────── */
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
      <div className="space-y-5 animate-fade-in pb-6">
        <Skeleton className="h-44 rounded-[2rem]" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-[2rem]" />
        <Skeleton className="h-60 rounded-[2rem]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-3xl bg-muted/40 mx-auto mb-4 flex items-center justify-center">
          <IndianRupee className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="font-body text-sm text-muted-foreground">No fee data available yet.</p>
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
  const getPerSemFee = (sem: number) =>
    semFeeMap[sem] ?? (totalFee > 0 ? Math.round(totalFee / 6) : 0);

  const perSemFee = getPerSemFee(currentSemester);
  const currentSemPaid = semPayments[currentSemester] || 0;
  const currentSemRemaining = Math.max(0, perSemFee - currentSemPaid);
  const currentSemPct = perSemFee > 0 ? Math.round((currentSemPaid / perSemFee) * 100) : 0;

  const summaryTotalFee =
    summaryFilter === "all" ? totalFee : getPerSemFee(Number(summaryFilter));
  const summaryPaid =
    summaryFilter === "all" ? feePaid : (semPayments[Number(summaryFilter)] || 0);
  const summaryRemaining = Math.max(0, summaryTotalFee - summaryPaid);
  const summaryPaymentsCount =
    summaryFilter === "all"
      ? payments.length
      : payments.filter((p: any) => String(p.semester || 1) === summaryFilter).length;

  const filteredPayments = payments.filter((p: any) => {
    const matchSem = semFilter === "all" || String(p.semester) === semFilter;
    const matchMethod = methodFilter === "all" || p.payment_method === methodFilter;
    const pDate = new Date(p.created_at);
    const matchFrom = !dateFrom || pDate >= new Date(dateFrom);
    const matchTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
    return matchSem && matchMethod && matchFrom && matchTo;
  });
  const filteredTotal = filteredPayments.reduce(
    (s: number, p: any) => s + Number(p.amount), 0,
  );

  const methodStats = payments.reduce((acc: Record<string, number>, p: any) => {
    acc[p.payment_method || "Cash"] =
      (acc[p.payment_method || "Cash"] || 0) + Number(p.amount);
    return acc;
  }, {} as Record<string, number>);
  const semStats = payments.reduce((acc: Record<number, number>, p: any) => {
    const s = p.semester || 1;
    acc[s] = (acc[s] || 0) + Number(p.amount);
    return acc;
  }, {});

  const uniqueMethods = [...new Set(payments.map((p: any) => p.payment_method || "Cash"))];

  const clearFilters = () => {
    setSemFilter("all"); setMethodFilter("all"); setDateFrom(""); setDateTo("");
  };
  const hasFilters =
    semFilter !== "all" || methodFilter !== "all" || dateFrom || dateTo;

  // ── Chart data ──
  const donutData = [
    { name: "Paid", value: summaryPaid },
    { name: "Remaining", value: summaryRemaining },
  ];
  const DONUT_COLORS = [EMERALD, ROSE];

  const semChartData = [1, 2, 3, 4, 5, 6].map((s) => ({
    sem: `S${s}`,
    Fee: getPerSemFee(s),
    Paid: semPayments[s] || 0,
  }));

  const methodEntries = Object.entries(methodStats);
  const methodTotal = methodEntries.reduce((s, [, v]) => s + Number(v), 0);

  /* ──────────────────────  Render  ────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in pb-6 max-w-5xl mx-auto">

      {/* ════════ HERO ════════ */}
      <SectionCard className="p-6 sm:p-8">
        {/* Aurora wash */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[100px] opacity-50"
          style={{ background: `radial-gradient(circle, ${GOLD_SOFT}, transparent 70%)` }} />
        <div className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-40"
          style={{ background: `radial-gradient(circle, ${EMERALD_SOFT}, transparent 70%)` }} />

        <div className="relative flex items-start gap-3">
          <BackButton />
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 bg-background/40 backdrop-blur-xl mb-2.5">
              <Sparkles className="w-3 h-3" style={{ color: GOLD }} />
              <span className="font-body text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/70">
                Fee Hub
              </span>
            </div>
            <h1 className="font-display text-[26px] sm:text-[34px] leading-[1.05] font-bold tracking-tight text-foreground">
              Your fees,<br className="sm:hidden" />
              <span className="text-muted-foreground/70"> at a glance</span>
            </h1>
            <p className="font-body text-[13px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {(student as any).courses?.name || "—"} · Sem {student.semester || "—"} · {student.roll_number}
              </span>
            </p>
          </div>
        </div>

        {/* Headline number */}
        <div className="relative mt-7">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-1.5">
            {feeRemaining > 0 ? "Outstanding balance" : "All paid"}
            <InfoTip text="The remaining balance across your entire program after applying all recorded payments." />
          </p>
          <p className="font-display font-bold tracking-tight tabular-nums mt-1.5 text-[44px] sm:text-[56px] leading-none"
            style={{ color: feeRemaining > 0 ? "hsl(var(--foreground))" : EMERALD }}>
            {feeRemaining > 0 ? `₹${feeRemaining.toLocaleString()}` : "₹0"}
          </p>
          <p className="font-body text-[12px] text-muted-foreground mt-2">
            of ₹{totalFee.toLocaleString()} total · {pct}% paid
          </p>

          {/* Progress rail */}
          <div className="mt-4 h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${EMERALD}, ${GOLD})`,
              }}
            />
          </div>
        </div>

        {/* 2-tile ribbon: Paid & Remaining */}
        <div className="relative grid grid-cols-2 gap-2.5 mt-6">
          {[
            { label: "Paid", value: `₹${feePaid.toLocaleString()}`, tint: EMERALD, bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            {
              label: "Remaining",
              value: feeRemaining > 0 ? `₹${feeRemaining.toLocaleString()}` : "Cleared",
              tint: feeRemaining > 0 ? ROSE : EMERALD,
              bg: feeRemaining > 0 ? "bg-rose-500/10" : "bg-emerald-500/10",
              border: feeRemaining > 0 ? "border-rose-500/20" : "border-emerald-500/20",
            },
          ].map((t) => (
            <div key={t.label}
              className={`rounded-2xl px-3.5 py-3 ${t.bg} dark:bg-white/[0.04] border ${t.border} backdrop-blur-xl`}
            >
              <p className="font-body text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/90">{t.label}</p>
              <p className="font-display text-[15px] sm:text-[17px] font-bold tabular-nums mt-1 truncate" style={{ color: t.tint }}>
                {t.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ════════ CURRENT SEMESTER BANNER ════════ */}
      <SectionCard className="p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-50"
          style={{
            background: currentSemRemaining > 0
              ? `radial-gradient(circle, ${GOLD_SOFT}, transparent 70%)`
              : `radial-gradient(circle, ${EMERALD_SOFT}, transparent 70%)`,
          }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{
                background: currentSemRemaining > 0 ? GOLD_SOFT : EMERALD_SOFT,
                borderColor: currentSemRemaining > 0 ? "hsl(43 86% 58% / 0.3)" : "hsl(152 64% 48% / 0.3)",
              }}
            >
              <Calendar className="w-5 h-5" style={{ color: currentSemRemaining > 0 ? GOLD : EMERALD }} />
            </div>
            <div className="min-w-0">
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Current · Semester {currentSemester}
              </p>
              <p className="font-display text-[20px] sm:text-[22px] font-bold tabular-nums mt-0.5 truncate"
                style={{ color: currentSemRemaining > 0 ? GOLD : EMERALD }}>
                {currentSemRemaining > 0 ? `₹${currentSemRemaining.toLocaleString()} due` : "Fully paid"}
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-body text-[11px] text-muted-foreground">
                ₹{currentSemPaid.toLocaleString()} of ₹{perSemFee.toLocaleString()}
              </span>
              <span className="font-display text-[12px] font-bold tabular-nums">{currentSemPct}%</span>
            </div>
            <div className="h-2 bg-foreground/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(currentSemPct, 100)}%`,
                  background: currentSemPct >= 100
                    ? `linear-gradient(90deg, ${EMERALD}, hsl(152 64% 58%))`
                    : `linear-gradient(90deg, ${GOLD}, ${AMBER})`,
                }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ════════ SCOPE PICKER + DONUT + STATS ════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              Breakdown
            </span>
            <InfoTip text="Switch between the full program and individual semesters." />
          </div>
          <Segmented
            value={summaryFilter}
            onChange={setSummaryFilter}
            ariaLabel="Fee scope"
            options={[
              { value: "all", label: "Overall" },
              ...[1, 2, 3, 4, 5, 6].map((s) => ({
                value: String(s),
                label: `S${s}`,
                hint: s === currentSemester,
              })),
            ]}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Donut */}
          <SectionCard className="lg:col-span-1 p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4" style={{ color: EMERALD }} />
              <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
                {summaryFilter === "all" ? "Overall" : `Semester ${summaryFilter}`}
              </h3>
              <InfoTip text="Paid vs remaining for the selected scope." />
            </div>
            <p className="font-body text-[11px] text-muted-foreground mb-3">Paid vs remaining</p>

            <div className="relative h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={58} outerRadius={82}
                    paddingAngle={summaryRemaining > 0 && summaryPaid > 0 ? 4 : 0}
                    dataKey="value"
                    stroke="transparent"
                  >
                    {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border) / 0.5)",
                      borderRadius: 14,
                      fontSize: 12,
                      boxShadow: "0 8px 24px -8px rgba(0,0,0,0.2)",
                    }}
                    formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-display text-[26px] font-bold tabular-nums leading-none text-foreground">
                  {summaryTotalFee > 0
                    ? Math.round((summaryPaid / summaryTotalFee) * 100)
                    : 0}
                  %
                </span>
                <span className="font-body text-[10px] mt-1 uppercase tracking-[0.15em] text-muted-foreground/80">Paid</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-2xl p-2.5 border border-border/40"
                style={{ background: EMERALD_SOFT }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: EMERALD }} />
                  <span className="font-body text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">Paid</span>
                </div>
                <p className="font-display text-[13px] font-bold tabular-nums mt-0.5" style={{ color: EMERALD }}>
                  ₹{summaryPaid.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl p-2.5 border border-border/40"
                style={{ background: summaryRemaining > 0 ? ROSE_SOFT : EMERALD_SOFT }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: summaryRemaining > 0 ? ROSE : EMERALD }} />
                  <span className="font-body text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">Due</span>
                </div>
                <p className="font-display text-[13px] font-bold tabular-nums mt-0.5"
                  style={{ color: summaryRemaining > 0 ? ROSE : EMERALD }}>
                  {summaryRemaining > 0 ? `₹${summaryRemaining.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Stat tiles */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            {[
              {
                label: summaryFilter === "all" ? "Total Fee" : `Sem ${summaryFilter} Fee`,
                value: `₹${summaryTotalFee.toLocaleString()}`, Icon: IndianRupee, tint: "hsl(var(--foreground))",
              },
              {
                label: "Amount Paid",
                value: `₹${summaryPaid.toLocaleString()}`, Icon: CheckCircle2, tint: EMERALD,
              },
              {
                label: "Remaining",
                value: summaryRemaining > 0 ? `₹${summaryRemaining.toLocaleString()}` : "Cleared",
                Icon: summaryRemaining > 0 ? AlertCircle : CheckCircle2,
                tint: summaryRemaining > 0 ? ROSE : EMERALD,
              },
              {
                label: "Payments",
                value: String(summaryPaymentsCount), Icon: Receipt, tint: GOLD,
              },
            ].map(({ label, value, Icon, tint }) => (
              <SectionCard key={label} className="p-4 group hover:-translate-y-0.5 transition-transform duration-300">
                <Icon className="w-4 h-4 mb-2 opacity-70" style={{ color: tint }} strokeWidth={2.2} />
                <p className="font-display text-[18px] font-bold tabular-nums truncate" style={{ color: tint }}>
                  {value}
                </p>
                <p className="font-body text-[10px] mt-0.5 uppercase tracking-[0.14em] text-muted-foreground/80">
                  {label}
                </p>
              </SectionCard>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ PAYMENT PROGRESS ════════ */}
      <SectionCard className="p-5 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              Payment progress
            </span>
            <InfoTip text="Switch between the current semester, the entire program, or any other semester." />
          </div>
          <Segmented
            value={progressFilter}
            onChange={setProgressFilter}
            ariaLabel="Progress scope"
            options={[
              { value: "current", label: `Current · S${currentSemester}` },
              { value: "all", label: "Overall" },
              ...[1, 2, 3, 4, 5, 6]
                .filter((s) => s !== currentSemester)
                .map((s) => ({ value: String(s), label: `S${s}` })),
            ]}
          />
        </div>

        {(() => {
          const progFee = progressFilter === "all"
            ? totalFee
            : progressFilter === "current"
              ? perSemFee
              : getPerSemFee(Number(progressFilter));
          const progPaid = progressFilter === "all"
            ? feePaid
            : progressFilter === "current"
              ? currentSemPaid
              : (semPayments[Number(progressFilter)] || 0);
          const progRemaining = Math.max(0, progFee - progPaid);
          const progPct = progFee > 0 ? Math.round((progPaid / progFee) * 100) : 0;
          const label = progressFilter === "all"
            ? "Overall"
            : progressFilter === "current"
              ? `Semester ${currentSemester}`
              : `Semester ${progressFilter}`;

          return (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="font-body text-[12px] text-muted-foreground">{label}</span>
                <span className="font-display text-[14px] font-bold tabular-nums text-foreground">{progPct}%</span>
              </div>
              <div className="h-2.5 bg-foreground/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${progPct}%`,
                    background:
                      progPct === 100
                        ? `linear-gradient(90deg, ${EMERALD}, hsl(152 64% 58%))`
                        : progPct > 50
                          ? `linear-gradient(90deg, ${GOLD}, ${AMBER})`
                          : `linear-gradient(90deg, ${ROSE}, hsl(15 80% 60%))`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-body text-[11.5px] text-muted-foreground">
                  Paid <span className="font-semibold tabular-nums" style={{ color: EMERALD }}>₹{progPaid.toLocaleString()}</span>
                </span>
                <span className="font-body text-[11.5px] text-muted-foreground">
                  {progRemaining > 0 ? (
                    <>Due <span className="font-semibold tabular-nums" style={{ color: ROSE }}>₹{progRemaining.toLocaleString()}</span></>
                  ) : (
                    <span className="font-semibold" style={{ color: EMERALD }}>Fully paid</span>
                  )}
                </span>
              </div>
            </>
          );
        })()}

        {(student.fee_due_date || student.fee_remarks) && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-1">
            {student.fee_due_date && (
              <p className="font-body text-[11.5px] text-muted-foreground">
                Due by <span className="font-semibold text-foreground">{format(new Date(student.fee_due_date), "dd MMM yyyy")}</span>
                {new Date(student.fee_due_date) < new Date() && feeRemaining > 0 && (
                  <span className="ml-2 font-bold text-[11px] px-2 py-0.5 rounded-md" style={{ background: ROSE_SOFT, color: ROSE }}>
                    Overdue
                  </span>
                )}
              </p>
            )}
            {student.fee_remarks && (
              <p className="font-body text-[11.5px] text-muted-foreground">
                Remarks: <span className="text-foreground/80">{student.fee_remarks}</span>
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* ════════ SEMESTER-WISE BAR CHART ════════ */}
      <SectionCard className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Semester-wise fee vs paid
          </h3>
          <InfoTip text="Compare each semester's fee against payments made so far." />
        </div>
        <p className="font-body text-[11px] text-muted-foreground mb-4">Hover any bar for exact amounts</p>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semChartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="sem" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <RTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border) / 0.5)",
                  borderRadius: 14,
                  fontSize: 12,
                  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.2)",
                }}
                formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
              />
              <Bar dataKey="Fee" fill={GOLD} radius={[8, 8, 0, 0]} opacity={0.35} />
              <Bar dataKey="Paid" fill={EMERALD} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* ════════ TWO-CARD GRID: METHOD + SEMESTER STATUS ════════ */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Payment method */}
        <SectionCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              By payment method
            </h3>
            <InfoTip text="Distribution of payments across methods used." />
          </div>
          {methodEntries.length > 0 ? (
            <div className="space-y-3">
              {methodEntries.map(([method, amount], i) => {
                const share = methodTotal > 0 ? (Number(amount) / methodTotal) * 100 : 0;
                const color = METHOD_PALETTE[i % METHOD_PALETTE.length];
                return (
                  <div key={method} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="font-body text-[12.5px] text-foreground font-medium">{method}</span>
                      </div>
                      <span className="font-body text-[12px] font-semibold tabular-nums text-foreground">
                        ₹{Number(amount).toLocaleString()}
                        <span className="text-muted-foreground font-normal ml-1.5">· {share.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${share}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-body text-[12px] text-muted-foreground text-center py-6">No payments yet</p>
          )}
        </SectionCard>

        {/* Semester status */}
        <SectionCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: EMERALD }} />
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              Semester status
            </h3>
            <InfoTip text="Paid and due status for every semester in your program." />
          </div>
          {hasSemFees ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5, 6].filter((s) => semFeeMap[s]).map((sem) => {
                const fee = semFeeMap[sem] || 0;
                const paid = semPayments[sem] || 0;
                const due = Math.max(0, fee - paid);
                const semPct = fee > 0 ? Math.round((paid / fee) * 100) : 0;
                return (
                  <div key={sem} className="p-3 rounded-2xl bg-foreground/[0.025] hover:bg-foreground/[0.04] transition-colors space-y-1.5 border border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-[12.5px] font-semibold text-foreground">
                        Semester {sem}
                        {sem === currentSemester && (
                          <span className="ml-1.5 font-body text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: GOLD }}>
                            Current
                          </span>
                        )}
                      </span>
                      <span className="font-body text-[11px] tabular-nums text-muted-foreground">
                        ₹{fee.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(semPct, 100)}%`,
                          background: semPct >= 100 ? EMERALD : GOLD,
                        }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-[10.5px] tabular-nums" style={{ color: EMERALD }}>
                        Paid ₹{paid.toLocaleString()}
                      </span>
                      <span className="font-body text-[10.5px] tabular-nums"
                        style={{ color: due > 0 ? ROSE : EMERALD }}>
                        {due > 0 ? `Due ₹${due.toLocaleString()}` : "Cleared"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : Object.keys(semStats).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(semStats).sort(([a], [b]) => Number(a) - Number(b)).map(([sem, amount]) => (
                <div key={sem} className="flex items-center justify-between p-3 rounded-2xl bg-foreground/[0.025] border border-border/30">
                  <span className="font-body text-[12.5px] text-foreground">Semester {sem}</span>
                  <span className="font-body text-[13px] font-bold tabular-nums text-foreground">
                    ₹{Number(amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-[12px] text-muted-foreground text-center py-6">
              No fee structure set yet
            </p>
          )}
        </SectionCard>
      </div>

      {/* ════════ FILTERS ════════ */}
      <SectionCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Filter payment history
          </h3>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <IosSelect
            value={semFilter}
            onChange={setSemFilter}
            options={[
              { value: "all", label: "All semesters" },
              ...[1, 2, 3, 4, 5, 6].map((s) => ({ value: String(s), label: `Semester ${s}` })),
            ]}
          />
          <IosSelect
            value={methodFilter}
            onChange={setMethodFilter}
            options={[
              { value: "all", label: "All methods" },
              ...uniqueMethods.map((m) => ({ value: String(m), label: String(m) })),
            ]}
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="font-body text-[13px] font-medium border border-border/40 rounded-xl px-3.5 py-2 bg-muted/30 dark:bg-white/[0.04] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="font-body text-[13px] font-medium border border-border/40 rounded-xl px-3.5 py-2 bg-muted/30 dark:bg-white/[0.04] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 font-body text-[12px] font-semibold text-muted-foreground hover:text-foreground rounded-xl px-3 py-2 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        {hasFilters && (
          <p className="font-body text-[11px] text-muted-foreground mt-3">
            Showing {filteredPayments.length} of {payments.length} payments · Filtered total{" "}
            <span className="font-semibold text-foreground tabular-nums">₹{filteredTotal.toLocaleString()}</span>
          </p>
        )}
      </SectionCard>

      {/* ════════ PAYMENT HISTORY ════════ */}
      <SectionCard>
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border/40 flex items-center justify-between">
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: GOLD }} /> Payment history
          </h3>
          <span className="font-body text-[11px] text-muted-foreground">
            {filteredPayments.length} {filteredPayments.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-14 px-5">
            <Wallet className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-body text-[13px] text-muted-foreground">
              {hasFilters ? "No payments match your filters" : "No payments recorded yet"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {filteredPayments.map((p: any) => (
              <li key={p.id}
                className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 hover:bg-foreground/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-border/30"
                    style={{ background: EMERALD_SOFT }}>
                    <IndianRupee className="w-4 h-4" style={{ color: EMERALD }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-bold tabular-nums" style={{ color: EMERALD }}>
                      ₹{Number(p.amount).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="font-body text-[10px] px-1.5 py-0.5 rounded-md bg-foreground/[0.06] text-foreground/70 font-medium">
                        {p.payment_method || "Cash"}
                      </span>
                      {p.semester && (
                        <span className="font-body text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: GOLD_SOFT, color: GOLD }}>
                          Sem {p.semester}
                        </span>
                      )}
                      {p.receipt_number && (
                        <span className="font-mono text-[10px] text-muted-foreground/80">
                          {p.receipt_number}
                        </span>
                      )}
                    </div>
                    {p.remarks && (
                      <p className="font-body text-[10.5px] text-muted-foreground mt-0.5 truncate">
                        {p.remarks}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-body text-[11.5px] font-medium text-foreground/80">
                    {format(new Date(p.created_at), "dd MMM yyyy")}
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground/70 mt-0.5">
                    {format(new Date(p.created_at), "hh:mm a")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ════════ FAQ ════════ */}
      <SectionCard className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center border border-border/40"
            style={{ background: GOLD_SOFT }}>
            <Info className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold tracking-tight text-foreground">
              Frequently asked questions
            </h3>
            <p className="font-body text-[11px] text-muted-foreground">Quick answers about fees &amp; payments</p>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {[
            { q: "How are my fees calculated?", a: "Your fees are set per semester by the administration. The total program fee is the sum of all six semesters and may vary based on your course and category." },
            { q: "What payment methods are accepted?", a: "We currently accept Cash, UPI, Bank Transfer, Cheque, and Card payments at the college office. Each payment is recorded with a unique receipt number." },
            { q: "When is my fee due?", a: 'The due date set by the administration appears under "Payment Progress". A red "Overdue" badge will appear if payment is past due and the balance is unpaid.' },
            { q: "Can I get a receipt for my payment?", a: 'Yes. Every payment in the "Payment History" section has a receipt number (e.g. RCP-0001). Visit the college office for a printed copy if needed.' },
            { q: "Whom do I contact for fee discrepancies?", a: "For any concerns, please reach out to the accounts office or use the Feedback section in your dashboard. Discrepancies are typically resolved within 2-3 working days." },
          ].map((item, i) => (
            <AccordionItem key={i} value={`q${i}`} className="border-border/40">
              <AccordionTrigger className="font-body text-[13.5px] hover:no-underline py-4">{item.q}</AccordionTrigger>
              <AccordionContent className="font-body text-[12.5px] text-muted-foreground leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
          <AccordionItem value="q-secure" className="border-none">
            <AccordionTrigger className="font-body text-[13.5px] hover:no-underline py-4">
              Is my payment information secure?
            </AccordionTrigger>
            <AccordionContent className="font-body text-[12.5px] text-muted-foreground leading-relaxed pb-4 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: EMERALD }} />
              <span>
                Yes. All financial records are encrypted in transit and at rest, and access is strictly limited to authorized staff via secure role-based controls.
              </span>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SectionCard>
    </div>
  );
}
