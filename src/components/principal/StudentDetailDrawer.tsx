import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CalendarCheck, GraduationCap, IndianRupee, Phone, ShieldAlert, ShieldCheck, TrendingDown, User } from "lucide-react";

type RiskBand = { label: string; color: string; icon: any };
function band(score: number): RiskBand {
  if (score >= 70) return { label: "High Risk", color: "text-red-500 bg-red-500/10 border-red-500/30", icon: ShieldAlert };
  if (score >= 40) return { label: "Watch", color: "text-amber-500 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle };
  return { label: "Healthy", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", icon: ShieldCheck };
}

function StatTile({ icon: Icon, label, value, sub, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "border-border bg-card",
    good: "border-emerald-500/20 bg-emerald-500/5",
    warn: "border-amber-500/20 bg-amber-500/5",
    bad: "border-red-500/20 bg-red-500/5",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      <div className="font-display text-2xl font-bold text-foreground tabular-nums">{value}</div>
      {sub && <div className="font-body text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function StudentDetailDrawer({
  student,
  open,
  onOpenChange,
}: {
  student: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const studentId = student?.id;

  const { data, isLoading } = useQuery({
    enabled: !!studentId && open,
    queryKey: ["principal-student-detail", studentId],
    queryFn: async () => {
      const [attRes, marksRes, feesRes, paysRes] = await Promise.all([
        supabase.from("attendance").select("status, date").eq("student_id", studentId),
        supabase.from("marks").select("subject, obtained_marks, max_marks, exam_type, semester, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
        supabase.from("semester_fees").select("semester, fee_amount, due_date").eq("student_id", studentId),
        supabase.from("fee_payments").select("amount, semester").eq("student_id", studentId),
      ]);
      const att = attRes.data || [];
      const present = att.filter((a: any) => a.status === "present").length;
      const total = att.length;
      const attPct = total > 0 ? Math.round((present / total) * 100) : 0;

      const marks = marksRes.data || [];
      const avgPct = marks.length
        ? Math.round(marks.reduce((s: number, m: any) => s + (m.obtained_marks / Math.max(m.max_marks, 1)) * 100, 0) / marks.length)
        : 0;

      const totalFee = (feesRes.data || []).reduce((s: number, f: any) => s + Number(f.fee_amount || 0), 0);
      const totalPaid = (paysRes.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const due = Math.max(totalFee - totalPaid, 0);

      const overdue = (feesRes.data || []).some(
        (f: any) => f.due_date && new Date(f.due_date) < new Date() && Number(f.fee_amount || 0) > 0,
      );

      // Risk score (0-100): attendance 50%, marks 30%, fees 20%
      let risk = 0;
      if (total === 0) risk += 20; else risk += Math.max(0, (75 - attPct)) * (50 / 75);
      if (marks.length === 0) risk += 10; else risk += Math.max(0, (50 - avgPct)) * (30 / 50);
      if (due > 0) risk += overdue ? 20 : 10;
      risk = Math.min(100, Math.round(risk));

      const reasons: string[] = [];
      if (attPct < 75 && total > 0) reasons.push(`Attendance ${attPct}% (below 75%)`);
      if (avgPct < 50 && marks.length > 0) reasons.push(`Avg marks ${avgPct}%`);
      if (due > 0) reasons.push(`Fee due ₹${due.toLocaleString("en-IN")}${overdue ? " (overdue)" : ""}`);

      return { attPct, present, total, avgPct, marks, totalFee, totalPaid, due, overdue, risk, reasons };
    },
  });

  const r = data ? band(data.risk) : null;
  const phone = student?.phone || student?.profile?.phone;
  const parentPhone = student?.parent_phone;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="p-5 border-b border-border bg-gradient-to-br from-primary/5 to-secondary/5">
          <SheetTitle className="font-display text-base">Student Snapshot</SheetTitle>
        </SheetHeader>

        {!student ? null : (
          <div className="p-5 space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 border border-border shadow-sm">
                <span className="font-display text-xl font-bold text-primary-foreground">
                  {(student.profile?.full_name || "S").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-bold text-foreground truncate">{student.profile?.full_name || "—"}</h3>
                <p className="font-body text-xs text-primary font-semibold">{student.roll_number}</p>
                <p className="font-body text-xs text-muted-foreground truncate">
                  {student.courses?.name || "—"} · Sem {student.semester}
                </p>
              </div>
            </div>

            {/* Risk banner */}
            {isLoading || !r ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : (
              <div className={`rounded-xl border p-4 flex items-center gap-3 ${r.color}`}>
                <r.icon className="w-6 h-6 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold">{r.label}</span>
                    <span className="font-body text-xs font-bold tabular-nums">Score {data!.risk}/100</span>
                  </div>
                  {data!.reasons.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {data!.reasons.map((x, i) => (
                        <li key={i} className="font-body text-[11px] opacity-90">• {x}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-body text-[11px] opacity-90 mt-1">All key metrics look healthy.</p>
                  )}
                </div>
              </div>
            )}

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </>
              ) : (
                <>
                  <StatTile
                    icon={CalendarCheck}
                    label="Attendance"
                    value={`${data!.attPct}%`}
                    sub={`${data!.present}/${data!.total} classes`}
                    tone={data!.total === 0 ? "default" : data!.attPct >= 75 ? "good" : data!.attPct >= 60 ? "warn" : "bad"}
                  />
                  <StatTile
                    icon={GraduationCap}
                    label="Avg Marks"
                    value={`${data!.avgPct}%`}
                    sub={`${data!.marks.length} records`}
                    tone={data!.marks.length === 0 ? "default" : data!.avgPct >= 60 ? "good" : data!.avgPct >= 40 ? "warn" : "bad"}
                  />
                  <StatTile
                    icon={IndianRupee}
                    label="Fee Due"
                    value={`₹${data!.due.toLocaleString("en-IN")}`}
                    sub={data!.overdue ? "Overdue" : `Paid ₹${data!.totalPaid.toLocaleString("en-IN")}`}
                    tone={data!.due === 0 ? "good" : data!.overdue ? "bad" : "warn"}
                  />
                  <StatTile
                    icon={TrendingDown}
                    label="Total Fee"
                    value={`₹${data!.totalFee.toLocaleString("en-IN")}`}
                    sub={`Year ${student.year_level || 1}`}
                  />
                </>
              )}
            </div>

            {/* Recent marks */}
            <div>
              <h4 className="font-body text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recent Marks</h4>
              {isLoading ? (
                <Skeleton className="h-32 rounded-xl" />
              ) : data!.marks.length === 0 ? (
                <p className="font-body text-xs text-muted-foreground py-3">No marks recorded.</p>
              ) : (
                <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {data!.marks.slice(0, 6).map((m: any, i: number) => {
                    const pct = Math.round((m.obtained_marks / Math.max(m.max_marks, 1)) * 100);
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 p-2.5 hover:bg-muted/30">
                        <div className="min-w-0">
                          <p className="font-body text-sm font-medium text-foreground truncate">{m.subject}</p>
                          <p className="font-body text-[10px] text-muted-foreground uppercase">{m.exam_type} · Sem {m.semester}</p>
                        </div>
                        <Badge variant={pct >= 60 ? "default" : pct >= 40 ? "secondary" : "destructive"} className="shrink-0 tabular-nums">
                          {m.obtained_marks}/{m.max_marks}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contact actions */}
            <div className="grid grid-cols-2 gap-2">
              {phone && (
                <a href={`tel:${phone}`}>
                  <Button variant="outline" className="w-full rounded-xl font-body text-xs">
                    <Phone className="w-3.5 h-3.5 mr-1.5" /> Call Student
                  </Button>
                </a>
              )}
              {parentPhone && (
                <a href={`tel:${parentPhone}`}>
                  <Button variant="outline" className="w-full rounded-xl font-body text-xs">
                    <User className="w-3.5 h-3.5 mr-1.5" /> Call Parent
                  </Button>
                </a>
              )}
            </div>

            {/* Meta */}
            <div className="border-t border-border pt-4 space-y-1.5">
              {[
                ["Email", student.profile?.email || "—"],
                ["Phone", phone || "—"],
                ["Parent Phone", parentPhone || "—"],
                ["Admission Year", student.admission_year || "—"],
                ["Address", student.address || "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3 text-xs">
                  <span className="font-body font-semibold text-muted-foreground uppercase tracking-wider w-28 shrink-0">{k}</span>
                  <span className="font-body text-foreground break-words">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
