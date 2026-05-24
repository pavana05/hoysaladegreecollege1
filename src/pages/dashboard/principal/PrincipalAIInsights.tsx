import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import BackButton from "@/components/BackButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, AlertTriangle, TrendingDown, Users, IndianRupee, Search, RefreshCw,
  Activity, ShieldAlert, Lightbulb, Brain, ArrowRight, CheckCircle2, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Risk = {
  id: string; name: string; roll: string; course: string; semester: number | null;
  attendancePct: number; avgMark: number | null; feeDue: number;
  score: number; level: "High" | "Medium" | "Low"; reasons: string[];
};
type Insights = {
  summary: string;
  recommendations: { title: string; detail: string; priority: "high" | "medium" | "low" }[];
  anomalies: { severity: "high" | "medium" | "low"; title: string; detail: string }[];
  stats: any;
  riskStudents: Risk[];
  examPredictor: { code: string; failRate: number; sample: number }[];
};

const levelStyle: Record<Risk["level"], string> = {
  High: "bg-red-500/15 text-red-500 border-red-500/30",
  Medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};
const sevStyle: Record<string, string> = {
  high: "bg-red-500/10 border-red-500/30 text-red-500",
  medium: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  low: "bg-sky-500/10 border-sky-500/30 text-sky-500",
};
const priorityDot: Record<string, string> = {
  high: "bg-red-500", medium: "bg-amber-500", low: "bg-emerald-500",
};

export default function PrincipalAIInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"overview" | "risk" | "exam">("overview");
  const [filterLevel, setFilterLevel] = useState<"all" | "High" | "Medium" | "Low">("all");

  // Smart search
  const [openSearch, setOpenSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data: res, error } = await supabase.functions.invoke("principal-ai-insights", { body: { action: "insights" } });
    if (error) toast.error("Failed to load AI insights");
    else setData(res as Insights);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenSearch(s => !s);
      }
      if (e.key === "Escape") setOpenSearch(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data: res, error } = await supabase.functions.invoke("principal-ai-insights", {
      body: { action: "search", query },
    });
    if (error) toast.error("Search failed");
    else setSearchResults((res as any)?.results || []);
    setSearching(false);
  };

  const filteredRisk = useMemo(() => {
    if (!data) return [];
    return filterLevel === "all" ? data.riskStudents : data.riskStudents.filter(r => r.level === filterLevel);
  }, [data, filterLevel]);

  const maxFail = useMemo(() => Math.max(1, ...(data?.examPredictor || []).map(e => e.failRate)), [data]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead title="AI Insights — Principal" description="AI-powered briefing, risk analytics and smart search for the principal" noIndex />
      <BackButton />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" /> AI Insights Engine
            </div>
            <h1 className="font-body text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              Principal Briefing
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpenSearch(true)} className="gap-2">
            <Search className="w-3.5 h-3.5" /> Smart Search
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 rounded bg-muted/60 border border-border/50 font-mono text-[9px]">⌘K</kbd>
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/40 border border-border/50 w-fit">
        {[
          { k: "overview", label: "Overview" },
          { k: "risk", label: "Dropout Risk" },
          { k: "exam", label: "Exam Predictor" },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-body font-medium transition-all ${tab === t.k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      ) : !data ? (
        <div className="bg-card border border-border/60 rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">No insights available.</p>
        </div>
      ) : tab === "overview" ? (
        <>
          {/* Daily AI Briefing */}
          <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-7">
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Today's Briefing</div>
                <p className="font-body text-[14.5px] leading-relaxed text-foreground">{data.summary}</p>
              </div>
            </div>
            {/* Quick stats strip */}
            <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Today's Attendance" value={`${data.stats.todayAttendancePct}%`} icon={Activity} tint="emerald" />
              <Stat label="High Risk Students" value={String(data.stats.highRisk)} icon={ShieldAlert} tint="red" />
              <Stat label="Fee Pending" value={`₹${Math.round(data.stats.feePending / 1000)}K`} icon={IndianRupee} tint="amber" />
              <Stat label="Open Complaints" value={String(data.stats.openComplaints)} icon={AlertTriangle} tint="sky" />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Recommendations */}
            <Card title="AI Recommendations" icon={Lightbulb} accent="text-primary">
              {data.recommendations.length === 0 ? (
                <Empty msg="No recommendations right now." />
              ) : (
                <ul className="space-y-2.5">
                  {data.recommendations.map((r, i) => (
                    <li key={i} className="group flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/40 transition-colors">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot[r.priority]}`} />
                      <div className="min-w-0">
                        <p className="font-body text-[13px] font-semibold text-foreground">{r.title}</p>
                        <p className="font-body text-[12px] text-muted-foreground mt-0.5">{r.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Anomaly Alerts */}
            <Card title="Anomaly Alerts" icon={AlertTriangle} accent="text-amber-500">
              {data.anomalies.length === 0 ? (
                <div className="flex items-center gap-2 text-[13px] text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" /> No anomalies detected
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {data.anomalies.map((a, i) => (
                    <li key={i} className={`p-3 rounded-xl border ${sevStyle[a.severity]}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body text-[13px] font-semibold">{a.title}</p>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${sevStyle[a.severity]} border-current`}>{a.severity}</Badge>
                      </div>
                      <p className="font-body text-[12px] text-foreground/80 mt-1">{a.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : tab === "risk" ? (
        <Card title="Predictive Dropout Risk" icon={TrendingDown} accent="text-red-500"
          right={
            <div className="flex gap-1">
              {(["all", "High", "Medium", "Low"] as const).map(l => (
                <button key={l} onClick={() => setFilterLevel(l)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${filterLevel === l ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>
                  {l === "all" ? "All" : l}
                </button>
              ))}
            </div>
          }>
          {filteredRisk.length === 0 ? <Empty msg="No students match this filter." /> : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-muted-foreground text-left text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-2 font-medium">Student</th>
                    <th className="py-2 px-2 font-medium">Course</th>
                    <th className="py-2 px-2 font-medium">Attend.</th>
                    <th className="py-2 px-2 font-medium">Avg</th>
                    <th className="py-2 px-2 font-medium">Fee Due</th>
                    <th className="py-2 px-2 font-medium">Reasons</th>
                    <th className="py-2 px-2 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisk.map(r => (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-foreground">{r.name}</div>
                        <div className="text-[10.5px] text-muted-foreground">{r.roll}</div>
                      </td>
                      <td className="py-2.5 px-2 text-foreground/80">{r.course} {r.semester ? `· S${r.semester}` : ""}</td>
                      <td className={`py-2.5 px-2 tabular-nums ${r.attendancePct < 75 ? "text-red-500" : "text-foreground"}`}>{r.attendancePct}%</td>
                      <td className="py-2.5 px-2 tabular-nums text-foreground/80">{r.avgMark !== null ? `${r.avgMark}%` : "—"}</td>
                      <td className="py-2.5 px-2 tabular-nums text-foreground/80">{r.feeDue > 0 ? `₹${r.feeDue.toLocaleString("en-IN")}` : "—"}</td>
                      <td className="py-2.5 px-2 text-[11.5px] text-muted-foreground max-w-xs truncate">{r.reasons.join(" · ") || "—"}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant="outline" className={`${levelStyle[r.level]} border text-[10.5px] uppercase tracking-wider`}>{r.level}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card title="Exam Performance Predictor" icon={Activity} accent="text-sky-500">
          {data.examPredictor.length === 0 ? <Empty msg="Not enough mark data yet." /> : (
            <div className="space-y-2.5">
              {data.examPredictor.map(e => (
                <div key={e.code} className="flex items-center gap-3">
                  <div className="w-16 font-body text-[12.5px] font-medium text-foreground">{e.code}</div>
                  <div className="flex-1 h-7 rounded-lg bg-muted/40 overflow-hidden relative">
                    <div
                      className={`h-full transition-all ${e.failRate >= 30 ? "bg-red-500/70" : e.failRate >= 15 ? "bg-amber-500/70" : "bg-emerald-500/70"}`}
                      style={{ width: `${Math.max(4, (e.failRate / maxFail) * 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-[11.5px] font-medium text-foreground">
                      {e.failRate}% predicted fail · {e.sample} marks recorded
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Command+K Search Modal */}
      {openSearch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4" onClick={() => setOpenSearch(false)}>
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSearch()}
                placeholder='Try: "BCA students with attendance under 60%" or "teachers who joined 2024"'
                className="border-0 bg-transparent focus-visible:ring-0 px-0 text-[13.5px]"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Button size="sm" onClick={runSearch} disabled={searching || !query.trim()} className="gap-1">
                Search <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {searchResults === null ? (
                <p className="text-[12px] text-muted-foreground text-center py-8">Ask anything about students, teachers, or courses.</p>
              ) : searchResults.length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-8">No results found.</p>
              ) : (
                <ul className="space-y-1.5">
                  {searchResults.map((r: any, i) => (
                    <li key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 border border-transparent hover:border-border/50 transition-colors">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[13px] text-foreground truncate">{r.name || r.title || r.code}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {r.roll && `${r.roll} · `}{r.course || r.email || r.employee_id || ""}
                          {typeof r.attendancePct === "number" && ` · ${r.attendancePct}% attendance`}
                          {r.level && ` · ${r.level} risk`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, icon: Icon, accent, right, children }: any) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accent}`} />
          <h3 className="font-body text-[14px] font-semibold text-foreground">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tint }: any) {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    red: "bg-red-500/10 text-red-500",
    amber: "bg-amber-500/10 text-amber-500",
    sky: "bg-sky-500/10 text-sky-500",
  };
  return (
    <div className="bg-card/60 border border-border/50 rounded-xl p-3 backdrop-blur-sm">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${tints[tint]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="font-body text-lg font-bold text-foreground tabular-nums">{value}</p>
      <p className="font-body text-[10.5px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-[12.5px] text-muted-foreground text-center py-6">{msg}</p>;
}
