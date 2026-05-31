import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, AlertCircle, CheckCircle2, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import DataTableShell from "@/components/principal/DataTableShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function PrincipalFees() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["pf-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,name,code").eq("is_active", true).order("name")).data || [],
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pf-rows", courseFilter],
    queryFn: async () => {
      let sq = supabase.from("students").select("id,user_id,roll_number,course_id,semester,total_fee,fee_paid,courses(name,code)").eq("is_active", true);
      if (courseFilter !== "all") sq = sq.eq("course_id", courseFilter);
      const { data: students } = await sq;
      if (!students?.length) return [];
      const userIds = students.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id,full_name").in("user_id", userIds);
      return students.map((s: any) => {
        const total = Number(s.total_fee) || 0;
        const paid = Number(s.fee_paid) || 0;
        const balance = Math.max(0, total - paid);
        return {
          ...s,
          full_name: profiles?.find((p) => p.user_id === s.user_id)?.full_name || "—",
          total, paid, balance,
          status: total === 0 ? "unset" : balance === 0 ? "paid" : paid > 0 ? "partial" : "due",
        };
      });
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return r.full_name.toLowerCase().includes(q) || r.roll_number?.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const totals = rows.reduce(
    (a: any, r: any) => ({
      collected: a.collected + r.paid,
      pending: a.pending + r.balance,
      paidCount: a.paidCount + (r.status === "paid" ? 1 : 0),
      dueCount: a.dueCount + (r.status === "due" || r.status === "partial" ? 1 : 0),
    }),
    { collected: 0, pending: 0, paidCount: 0, dueCount: 0 },
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Fee Oversight</h2>
            <p className="font-body text-xs text-muted-foreground">Track collections and outstanding balances</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Wallet} label="Collected" value={INR(totals.collected)} tone="emerald" />
        <Stat icon={AlertCircle} label="Pending" value={INR(totals.pending)} tone="amber" />
        <Stat icon={CheckCircle2} label="Fully Paid" value={totals.paidCount} tone="emerald" />
        <Stat icon={AlertCircle} label="With Dues" value={totals.dueCount} tone="red" />
      </div>

      <DataTableShell
        title="Student Fees"
        icon={DollarSign}
        items={filtered}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or roll number..."
        emptyText="No fee records to display."
        filters={
          <>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="unset">Unset</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      >
        {(paged) => (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
              <div className="col-span-4">Student</div>
              <div className="col-span-2">Course</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-2 text-right">Paid</div>
              <div className="col-span-2 text-right">Balance</div>
            </div>
            {paged.map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 px-4 py-3 items-center border-b border-border/50 last:border-0 text-sm">
                <div className="col-span-4">
                  <p className="font-medium truncate">{r.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{r.roll_number || "—"} · Sem {r.semester ?? "—"}</p>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">{r.courses?.code || "—"}</div>
                <div className="col-span-2 text-right tabular-nums text-xs">{INR(r.total)}</div>
                <div className="col-span-2 text-right tabular-nums text-xs text-emerald-500">{INR(r.paid)}</div>
                <div className="col-span-2 text-right tabular-nums text-xs">
                  <span className={`font-bold ${r.balance === 0 ? "text-emerald-500" : "text-red-500"}`}>{INR(r.balance)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataTableShell>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: any) {
  const toneMap: any = {
    emerald: "bg-emerald-500/15 text-emerald-500",
    amber: "bg-amber-500/15 text-amber-500",
    red: "bg-red-500/15 text-red-500",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
        <p className="font-display text-lg font-bold tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}
