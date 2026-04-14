import { useState } from "react";
import { ArrowLeft, Monitor, Save, Edit2, Trash2, Users, Armchair } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/BackButton";

const COURSE_LABELS: Record<string, string> = {
  BCA: "BCA (Computer Applications)",
  BCOM: "B.Com Regular",
  BCOM_PROF: "B.Com Professional",
  BBA: "BBA (Business Administration)",
};

export default function AdminDepartmentsAndSeats() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // --- Departments state ---
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", hod_name: "", description: "" });

  const { data: departments = [], isLoading: deptLoading } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data || [];
    },
  });

  const { data: deptStats = {} } = useQuery({
    queryKey: ["admin-dept-stats"],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id, department_id").eq("is_active", true);
      const { data: students } = await supabase.from("students").select("id, course_id").eq("is_active", true);
      const { data: teachers } = await supabase.from("teachers").select("id, department_id").eq("is_active", true);
      const stats: Record<string, { students: number; courses: number; teachers: number }> = {};
      (courses || []).forEach((c: any) => {
        if (!c.department_id) return;
        if (!stats[c.department_id]) stats[c.department_id] = { students: 0, courses: 0, teachers: 0 };
        stats[c.department_id].courses++;
        const stuCount = (students || []).filter((s: any) => s.course_id === c.id).length;
        stats[c.department_id].students += stuCount;
      });
      (teachers || []).forEach((t: any) => {
        if (!t.department_id) return;
        if (!stats[t.department_id]) stats[t.department_id] = { students: 0, courses: 0, teachers: 0 };
        stats[t.department_id].teachers++;
      });
      return stats;
    },
  });

  const handleEdit = (dept: any) => {
    setEditing(dept.id);
    setForm({ name: dept.name, code: dept.code, hod_name: dept.hod_name || "", description: dept.description || "" });
  };

  const handleSave = async () => {
    if (!editing) return;
    const { error } = await supabase.from("departments").update({
      name: form.name, code: form.code, hod_name: form.hod_name, description: form.description,
    }).eq("id", editing);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Department updated!");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-departments"] });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    toast.success("Department deleted!");
    qc.invalidateQueries({ queryKey: ["admin-departments"] });
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("departments").update({ is_active: !currentActive }).eq("id", id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(currentActive ? "Department deactivated" : "Department activated");
    qc.invalidateQueries({ queryKey: ["admin-departments"] });
  };

  // --- Seats state ---
  const { data: seats = [], isLoading: seatsLoading } = useQuery({
    queryKey: ["admin-seats"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("admission_seats").select("*").order("course_code");
      return data || [];
    },
  });

  const [edits, setEdits] = useState<Record<string, number>>({});

  const saveSeatsMutation = useMutation({
    mutationFn: async () => {
      for (const [code, total] of Object.entries(edits)) {
        const { error } = await (supabase as any).from("admission_seats").update({ total_seats: total, updated_by: user?.id, updated_at: new Date().toISOString() }).eq("course_code", code);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Seats updated successfully!");
      setEdits({});
      qc.invalidateQueries({ queryKey: ["admin-seats"] });
      qc.invalidateQueries({ queryKey: ["admission-seats"] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-6">
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Departments & Seats</h2>
            <p className="font-body text-sm text-muted-foreground">Manage departments and available admission seats</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="departments" className="font-body text-xs gap-1.5">
            <Monitor className="w-3.5 h-3.5" /> Departments
          </TabsTrigger>
          <TabsTrigger value="seats" className="font-body text-xs gap-1.5">
            <Armchair className="w-3.5 h-3.5" /> Available Seats
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments">
          {deptLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No departments found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {departments.map((dept: any) => {
                const stats = deptStats[dept.id] || { students: 0, courses: 0, teachers: 0 };
                return (
                  <div key={dept.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    {editing === dept.id ? (
                      <div className="p-6 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="font-body text-xs text-muted-foreground mb-1 block">Department Name</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
                          </div>
                          <div>
                            <label className="font-body text-xs text-muted-foreground mb-1 block">Code</label>
                            <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputClass} />
                          </div>
                          <div>
                            <label className="font-body text-xs text-muted-foreground mb-1 block">HOD Name</label>
                            <input value={form.hod_name} onChange={e => setForm(f => ({ ...f, hod_name: e.target.value }))} className={inputClass} />
                          </div>
                        </div>
                        <div>
                          <label className="font-body text-xs text-muted-foreground mb-1 block">Description (Key Facilities, Qualifications, etc.)</label>
                          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className={inputClass} placeholder="Describe key facilities, teacher qualifications, labs, etc." />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSave} className="gap-1.5 text-xs"><Save className="w-3.5 h-3.5" /> Save</Button>
                          <Button variant="outline" onClick={() => setEditing(null)} className="text-xs">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-body text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{dept.code}</span>
                              <span className={`font-body text-[10px] px-2 py-0.5 rounded-full font-bold ${dept.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                                {dept.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-foreground">{dept.name}</h3>
                            {dept.hod_name && <p className="font-body text-sm text-muted-foreground mt-1">HOD: <span className="font-semibold text-foreground">{dept.hod_name}</span></p>}
                            {dept.description && <p className="font-body text-sm text-muted-foreground mt-1 line-clamp-3">{dept.description}</p>}
                            <div className="flex items-center gap-4 mt-3 flex-wrap">
                              <span className="font-body text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">{stats.students}</span> Students
                              </span>
                              <span className="font-body text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">{stats.courses}</span> Courses
                              </span>
                              <span className="font-body text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">{stats.teachers}</span> Teachers
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(dept)} className="gap-1.5 text-xs">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleToggleActive(dept.id, dept.is_active)} className="text-xs">
                              {dept.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(dept.id, dept.name)} className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/20">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Seats Tab */}
        <TabsContent value="seats">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
            {seatsLoading ? (
              <p className="font-body text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : (
              <div className="space-y-4">
                {seats.map((s: any) => (
                  <div key={s.course_code} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-border transition-colors">
                    <div className="flex-1">
                      <p className="font-body text-sm font-semibold text-foreground">{COURSE_LABELS[s.course_code] || s.course_code}</p>
                      <p className="font-body text-[10px] text-muted-foreground">Code: {s.course_code}</p>
                    </div>
                    <div className="w-24">
                      <input
                        type="number" min={1}
                        value={edits[s.course_code] ?? s.total_seats}
                        onChange={(e) => setEdits({ ...edits, [s.course_code]: Number(e.target.value) })}
                        className="w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-center font-bold text-lg"
                      />
                    </div>
                    <span className="font-body text-xs text-muted-foreground shrink-0">seats</span>
                  </div>
                ))}
                <Button onClick={() => saveSeatsMutation.mutate()} disabled={Object.keys(edits).length === 0 || saveSeatsMutation.isPending}
                  className="w-full rounded-xl font-body shadow-md mt-4">
                  <Save className="w-4 h-4 mr-2" /> {saveSeatsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
