import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import DataTableShell from "@/components/principal/DataTableShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInDays, parseISO } from "date-fns";

export default function PrincipalExams() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["pe-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,name,code").eq("is_active", true).order("name")).data || [],
  });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["pe-exams", courseFilter, typeFilter],
    queryFn: async () => {
      let q = supabase.from("exams").select("*, courses(name,code)").eq("is_active", true).order("exam_date", { ascending: true });
      if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
      if (typeFilter !== "all") q = q.eq("exam_type", typeFilter);
      return (await q).data || [];
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exams.filter((e: any) => e.title.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q));
  }, [exams, search]);

  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = exams.filter((e: any) => parseISO(e.exam_date) >= today).length;
  const past = exams.length - upcoming;
  const critical = exams.filter((e: any) => {
    const d = differenceInDays(parseISO(e.exam_date), today);
    return d >= 0 && d <= 3;
  }).length;

  const urgencyTone = (d: number) => d < 0 ? "bg-muted text-muted-foreground"
    : d <= 3 ? "bg-red-500/15 text-red-500"
    : d <= 7 ? "bg-amber-500/15 text-amber-500"
    : "bg-emerald-500/15 text-emerald-500";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Exam Schedule</h2>
            <p className="font-body text-xs text-muted-foreground">All scheduled internal and external exams</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat icon={Calendar} label="Upcoming" value={upcoming} tone="emerald" />
        <Stat icon={AlertCircle} label="Critical (≤3d)" value={critical} tone="red" />
        <Stat icon={CheckCircle2} label="Past" value={past} tone="muted" />
      </div>

      <DataTableShell
        title="Exam List"
        icon={ScrollText}
        items={filtered}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title or subject..."
        emptyText="No exams scheduled."
        filters={
          <>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      >
        {(paged) => (
          <div className="space-y-2">
            {paged.map((e: any) => {
              const d = differenceInDays(parseISO(e.exam_date), today);
              return (
                <div key={e.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm truncate">{e.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted uppercase tracking-wide">{e.exam_type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.subject} · {e.courses?.code || "—"} · Sem {e.semester ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{format(parseISO(e.exam_date), "dd MMM yyyy")}</p>
                    <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${urgencyTone(d)}`}>
                      {d < 0 ? "Done" : d === 0 ? "Today" : `${d}d`}
                    </span>
                  </div>
                </div>
              );
            })}
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
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
