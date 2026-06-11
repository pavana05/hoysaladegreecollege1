import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Eye, Phone, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, UserX, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, StatChip } from "@/components/dashboard/premium";

type SortKey = "roll_number" | "full_name" | "course" | "semester";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

export default function TeacherStudents() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [sortKey, setSortKey] = useState<SortKey>("roll_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-student-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: students = [], isLoading, isFetching } = useQuery({
    queryKey: ["teacher-students", courseFilter, semesterFilter],
    queryFn: async () => {
      let q = supabase
        .from("students")
        .select("id, user_id, roll_number, course_id, semester, admission_year, date_of_birth, is_active, year_level, academic_year_id, phone, address, parent_phone, avatar_url, father_name, mother_name, gender, courses(name, code)")
        .eq("is_active", true)
        .order("roll_number");
      if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
      if (semesterFilter !== "all") q = q.eq("semester", parseInt(semesterFilter));
      const { data: studentsData } = await q;
      if (!studentsData || studentsData.length === 0) return [];
      const userIds = studentsData.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
      return studentsData.map((s) => ({
        ...s,
        profile: profiles?.find((p) => p.user_id === s.user_id),
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = students.filter((s: any) => {
      if (!q) return true;
      const name = (s.profile?.full_name || "").toLowerCase();
      const roll = (s.roll_number || "").toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
    const sorted = [...rows].sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "full_name": av = a.profile?.full_name || ""; bv = b.profile?.full_name || ""; break;
        case "course": av = a.courses?.name || ""; bv = b.courses?.name || ""; break;
        case "semester": av = a.semester || 0; bv = b.semester || 0; break;
        default: av = a.roll_number || ""; bv = b.roll_number || "";
      }
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [students, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const hasFilters = search || courseFilter !== "all" || semesterFilter !== "all";
  const clearFilters = () => { setSearch(""); setCourseFilter("all"); setSemesterFilter("all"); setPage(1); };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Premium Header */}
      <PageHero
        icon={Users}
        eyebrow="Roster"
        title="Students"
        subtitle={`Showing ${filtered.length} of ${students.length} active students.`}
        chip={
          <StatChip
            variant="live"
            pulse
            label="Active"
            value={students.length}
          />
        }
      />

      {/* Filters */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="font-body text-sm font-bold text-foreground">Filter Students</h3>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs rounded-lg">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or roll..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 rounded-xl text-sm" />
          </div>
          <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
            className="border border-border rounded-xl px-3 py-2 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">All Courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
          <select value={semesterFilter} onChange={e => { setSemesterFilter(e.target.value); setPage(1); }}
            className="border border-border rounded-xl px-3 py-2 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">All Semesters</option>
            {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : paged.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
        ) : (
          paged.map((s: any) => (
            <div key={s.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all flex items-center gap-3">
              {s.avatar_url ? (
                <img src={s.avatar_url} alt={s.profile?.full_name} className="w-11 h-11 rounded-xl object-cover border-2 border-secondary/30 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-navy-dark/20 flex items-center justify-center shrink-0 border border-border">
                  <span className="font-display text-xs font-bold text-primary">{(s.profile?.full_name || "S")[0].toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5 gap-2">
                  <span className="font-body text-sm font-bold text-primary truncate">{s.roll_number}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Sem {s.semester}</span>
                    <Button size="sm" variant="outline" onClick={() => setViewStudent(s)} className="rounded-lg h-7 px-2 font-body text-xs">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="font-body text-sm font-medium text-foreground truncate">{s.profile?.full_name || "—"}</p>
                <p className="font-body text-xs text-muted-foreground truncate">{s.courses?.name || "—"}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : paged.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <SortableTh label="Roll No" k="roll_number" sortKey={sortKey} dir={sortDir} onClick={toggleSort} icon={<SortIcon k="roll_number" />} />
                  <SortableTh label="Name" k="full_name" sortKey={sortKey} dir={sortDir} onClick={toggleSort} icon={<SortIcon k="full_name" />} />
                  <SortableTh label="Course" k="course" sortKey={sortKey} dir={sortDir} onClick={toggleSort} icon={<SortIcon k="course" />} />
                  <SortableTh label="Semester" k="semester" sortKey={sortKey} dir={sortDir} onClick={toggleSort} icon={<SortIcon k="semester" />} align="center" />
                  <th className="text-left font-body text-xs font-semibold text-muted-foreground px-5 py-3.5">Phone</th>
                  <th className="text-center font-body text-xs font-semibold text-muted-foreground px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                 {paged.map((s: any) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="font-body text-sm px-5 py-4 font-semibold text-primary">{s.roll_number}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.profile?.full_name} className="w-9 h-9 rounded-lg object-cover border border-secondary/30" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-navy-dark/20 flex items-center justify-center border border-border">
                            <span className="font-display text-xs font-bold text-primary">{(s.profile?.full_name || "S")[0].toUpperCase()}</span>
                          </div>
                        )}
                        <span className="font-body text-sm font-medium text-foreground">{s.profile?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="font-body text-sm px-5 py-4 text-foreground">{s.courses?.name || "—"}</td>
                    <td className="font-body text-sm px-5 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">Sem {s.semester}</span>
                    </td>
                    <td className="font-body text-sm px-5 py-4 text-foreground">
                      {s.profile?.phone ? (
                        <a href={`tel:${s.profile.phone}`} className="text-primary hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {s.profile.phone}
                        </a>
                      ) : (s.parent_phone || "—")}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Button size="sm" variant="outline" onClick={() => setViewStudent(s)} className="rounded-xl font-body text-xs">
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/40 rounded-2xl px-4 py-3">
          <p className="font-body text-xs text-muted-foreground">
            Page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span> · {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-xl h-8 px-3 text-xs">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-xl h-8 px-3 text-xs">
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Student Details</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-3 mt-2">
              <div className="flex flex-col items-center p-5 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border">
                {(viewStudent as any).avatar_url ? (
                  <img
                    src={(viewStudent as any).avatar_url}
                    alt={viewStudent.profile?.full_name}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-secondary/30 shadow-lg mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-navy-dark flex items-center justify-center mb-3 border-4 border-secondary/20 shadow-lg">
                    <span className="font-display text-2xl font-bold text-primary-foreground">
                      {(viewStudent.profile?.full_name || "S").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                )}
                <h3 className="font-display text-lg font-bold text-foreground">{viewStudent.profile?.full_name || "—"}</h3>
                <p className="font-body text-sm text-primary font-semibold">{viewStudent.roll_number}</p>
              </div>
              {[
                ["Course", viewStudent.courses?.name || "—"],
                ["Semester", `Semester ${viewStudent.semester}`],
                ["Email", viewStudent.profile?.email || "—"],
                ["Student Phone", (viewStudent as any).phone || viewStudent.profile?.phone || "—"],
                ["Parent Phone", viewStudent.parent_phone || "—"],
                ["Date of Birth", viewStudent.date_of_birth || "—"],
                ["Address", viewStudent.address || "—"],
                ["Admission Year", viewStudent.admission_year || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 shrink-0">{k}</span>
                  <span className="font-body text-sm text-foreground font-medium">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                {((viewStudent as any).phone || viewStudent.profile?.phone) && (
                  <a href={`tel:${(viewStudent as any).phone || viewStudent.profile?.phone}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl font-body text-xs">
                      <Phone className="w-3 h-3 mr-1" /> Call Student
                    </Button>
                  </a>
                )}
                {viewStudent.parent_phone && (
                  <a href={`tel:${viewStudent.parent_phone}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl font-body text-xs">
                      <Phone className="w-3 h-3 mr-1" /> Call Parent
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableTh({ label, k, sortKey, dir, onClick, icon, align = "left" }: { label: string; k: SortKey; sortKey: SortKey; dir: SortDir; onClick: (k: SortKey) => void; icon: React.ReactNode; align?: "left" | "center" }) {
  return (
    <th className={`font-body text-xs font-semibold text-muted-foreground px-5 py-3.5 ${align === "center" ? "text-center" : "text-left"}`}>
      <button onClick={() => onClick(k)} className={`inline-flex items-center gap-1.5 hover:text-foreground transition-colors ${sortKey === k ? "text-foreground" : ""}`}>
        {label} {icon}
      </button>
    </th>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-3">
        <UserX className="w-6 h-6 text-muted-foreground" />
      </div>
      <h4 className="font-display text-base font-bold text-foreground mb-1">No students found</h4>
      <p className="font-body text-sm text-muted-foreground max-w-xs">
        {hasFilters ? "Try adjusting your search or filters to see more results." : "There are no active students to display yet."}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear} className="mt-4 rounded-xl text-xs">
          <X className="w-3 h-3 mr-1" /> Clear filters
        </Button>
      )}
    </div>
  );
}
