import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpCircle, Calendar, GraduationCap, BarChart3, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const AdminSemesterPromotion = lazy(() => import("./AdminSemesterPromotion"));
const AdminAcademicYear = lazy(() => import("./AdminAcademicYear"));
const AdminFinalSemesterMove = lazy(() => import("./AdminFinalSemesterMove"));
const AdminAcademicOverview = lazy(() => import("./AdminAcademicOverview"));

const Loader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-9 h-9 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

const TABS = [
  { value: "promotion", label: "Semester Promotion", icon: ArrowUpCircle, hint: "Move students up" },
  { value: "academic-years", label: "Academic Years", icon: Calendar, hint: "Manage sessions" },
  { value: "final-move", label: "Final Semester", icon: GraduationCap, hint: "Graduation flow" },
  { value: "academic-overview", label: "Academic Overview", icon: BarChart3, hint: "Insights & stats" },
];

export default function AdminPromotionHub() {
  const [tab, setTab] = useState("promotion");
  const active = TABS.find((t) => t.value === tab) ?? TABS[0];

  return (
    <>
      <SEOHead title="Promotion & Academic Years | Admin" description="Semester promotion and academic year management" noIndex />
      <div className="space-y-6 page-enter">
        {/* Premium hero header */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/40 p-6 sm:p-8 shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.35)]">
          <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Academic Control Center
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Promotion & Academic Years
                </h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                  Orchestrate semester promotions, manage academic sessions, and review institution-wide progress in one elegant workspace.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Now viewing</span>
              <span className="text-sm font-medium text-foreground">{active.label}</span>
              <span className="text-xs text-muted-foreground">{active.hint}</span>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          {/* Premium glass tab bar */}
          <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-1.5 shadow-sm overflow-x-auto">
            <TabsList className="relative bg-transparent p-0 h-auto flex w-full gap-1 min-w-max">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="group relative flex-1 min-w-[160px] gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300
                    hover:text-foreground hover:bg-muted/40
                    data-[state=active]:text-primary-foreground
                    data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80
                    data-[state=active]:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.55)]"
                >
                  <Icon className="w-4 h-4 transition-transform duration-300 group-data-[state=active]:scale-110" />
                  <span className="whitespace-nowrap">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="promotion" className="mt-0 focus-visible:outline-none"><Suspense fallback={<Loader />}><AdminSemesterPromotion /></Suspense></TabsContent>
          <TabsContent value="academic-years" className="mt-0 focus-visible:outline-none"><Suspense fallback={<Loader />}><AdminAcademicYear /></Suspense></TabsContent>
          <TabsContent value="final-move" className="mt-0 focus-visible:outline-none"><Suspense fallback={<Loader />}><AdminFinalSemesterMove /></Suspense></TabsContent>
          <TabsContent value="academic-overview" className="mt-0 focus-visible:outline-none"><Suspense fallback={<Loader />}><AdminAcademicOverview /></Suspense></TabsContent>
        </Tabs>
      </div>
    </>
  );
}

