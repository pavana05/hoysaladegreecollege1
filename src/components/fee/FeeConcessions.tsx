import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Percent, IndianRupee, Trash2, Search, Filter, CheckCircle,
  AlertCircle, Tag, Award, GraduationCap, Heart, Users, Sparkles, X, Edit2
} from "lucide-react";

const CONCESSION_TYPES = [
  { value: "merit", label: "Merit Scholarship", icon: Award, color: "text-amber-400", bg: "bg-amber-500/10" },
  { value: "sc_st", label: "SC/ST Concession", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  { value: "ews", label: "EWS / BPL", icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" },
  { value: "sports", label: "Sports Quota", icon: Award, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { value: "staff_ward", label: "Staff Ward", icon: GraduationCap, color: "text-purple-400", bg: "bg-purple-500/10" },
  { value: "other", label: "Other", icon: Tag, color: "text-muted-foreground", bg: "bg-muted/20" },
];

const inputClass = "w-full border border-border/60 rounded-xl px-3.5 py-2.5 font-body text-sm bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-muted/50 transition-all duration-300 placeholder:text-muted-foreground/50";

interface FeeConcessionProps {
  students: any[];
  courses: any[];
}

export default function FeeConcessions({ students, courses }: FeeConcessionProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editConcession, setEditConcession] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    student_id: "",
    concession_type: "merit",
    concession_name: "",
    amount: "",
    is_percentage: false,
    reason: "",
    semester: "",
    academic_year: "",
  });

  const { data: concessions = [], isLoading } = useQuery({
    queryKey: ["fee-concessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fee_concessions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addConcession = useMutation({
    mutationFn: async () => {
      if (!form.student_id || !form.concession_name || !form.amount) {
        throw new Error("Please fill all required fields");
      }
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      if (form.is_percentage && amount > 100) throw new Error("Percentage cannot exceed 100%");

      const payload = {
        student_id: form.student_id,
        concession_type: form.concession_type,
        concession_name: form.concession_name.trim(),
        amount,
        is_percentage: form.is_percentage,
        reason: form.reason.trim(),
        semester: form.semester ? parseInt(form.semester) : null,
        academic_year: form.academic_year.trim() || null,
        approved_by: user?.id,
      };

      if (editConcession) {
        const { error } = await supabase
          .from("fee_concessions")
          .update(payload)
          .eq("id", editConcession.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fee_concessions").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editConcession ? "Concession updated!" : "Concession added!");
      qc.invalidateQueries({ queryKey: ["fee-concessions"] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteConcession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fee_concessions")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concession removed");
      qc.invalidateQueries({ queryKey: ["fee-concessions"] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Failed to remove concession"),
  });

  const resetForm = () => {
    setForm({
      student_id: "",
      concession_type: "merit",
      concession_name: "",
      amount: "",
      is_percentage: false,
      reason: "",
      semester: "",
      academic_year: "",
    });
    setEditConcession(null);
    setShowAddModal(false);
  };

  const openEdit = (c: any) => {
    setForm({
      student_id: c.student_id,
      concession_type: c.concession_type,
      concession_name: c.concession_name,
      amount: String(c.amount),
      is_percentage: c.is_percentage,
      reason: c.reason || "",
      semester: c.semester ? String(c.semester) : "",
      academic_year: c.academic_year || "",
    });
    setEditConcession(c);
    setShowAddModal(true);
  };

  const getStudentInfo = (studentId: string) => {
    const s = students.find((st: any) => st.id === studentId);
    return s ? { name: s.profile?.full_name || "—", roll: s.roll_number, course: s.courses?.code || "—", semester: s.semester } : null;
  };

  const getTypeInfo = (type: string) => CONCESSION_TYPES.find(t => t.value === type) || CONCESSION_TYPES[5];

  const filteredConcessions = concessions.filter((c: any) => {
    const info = getStudentInfo(c.student_id);
    const matchSearch = !search || (info?.name || "").toLowerCase().includes(search.toLowerCase()) || (info?.roll || "").toLowerCase().includes(search.toLowerCase()) || c.concession_name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.concession_type === typeFilter;
    if (courseFilter !== "all") {
      const s = students.find((st: any) => st.id === c.student_id);
      if (!s || s.course_id !== courseFilter) return false;
    }
    return matchSearch && matchType;
  });

  // Summary stats
  const totalConcessions = concessions.length;
  const totalAmount = concessions.reduce((sum: number, c: any) => {
    if (c.is_percentage) {
      const s = students.find((st: any) => st.id === c.student_id);
      return sum + ((s?.total_fee || 0) * c.amount / 100);
    }
    return sum + Number(c.amount);
  }, 0);
  const typeCounts = CONCESSION_TYPES.map(t => ({
    ...t,
    count: concessions.filter((c: any) => c.concession_type === t.value).length,
  })).filter(t => t.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-primary/[0.02]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/[0.08] border border-amber-500/15 rounded-full px-3 py-1 mb-2">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="font-body text-[10px] text-amber-400 font-semibold uppercase tracking-[0.15em]">Fee Concessions</span>
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Manage Fee Concessions & Discounts</h3>
            <p className="font-body text-xs text-muted-foreground mt-1">Add, edit, and track fee concessions for students based on category, merit, or special criteria.</p>
          </div>
          <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="rounded-xl font-body text-xs bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 shadow-lg shadow-primary/20 shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Add Concession
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <p className="font-display text-xl font-bold text-foreground tabular-nums">{totalConcessions}</p>
          <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Active Concessions</p>
        </div>
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-display text-xl font-bold text-emerald-400 tabular-nums">₹{Math.round(totalAmount).toLocaleString()}</p>
          <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Total Concession Value</p>
        </div>
        {typeCounts.slice(0, 2).map(t => (
          <div key={t.value} className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-4">
            <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center mb-2`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <p className="font-display text-xl font-bold text-foreground tabular-nums">{t.count}</p>
            <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, roll no, or concession..." className={`${inputClass} pl-10`} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${inputClass} w-auto min-w-[150px]`}>
            <option value="all">All Types</option>
            {CONCESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className={`${inputClass} w-auto min-w-[140px]`}>
            <option value="all">All Courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>
      </div>

      {/* Concessions List */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border/30">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-400" />
            Active Concessions ({filteredConcessions.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filteredConcessions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <Tag className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-body text-sm text-muted-foreground">No concessions found</p>
            <p className="font-body text-xs text-muted-foreground/70 mt-1">Click "Add Concession" to create one</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredConcessions.map((c: any) => {
              const info = getStudentInfo(c.student_id);
              const typeInfo = getTypeInfo(c.concession_type);
              const TypeIcon = typeInfo.icon;
              const effectiveAmount = c.is_percentage
                ? (() => {
                    const s = students.find((st: any) => st.id === c.student_id);
                    return Math.round((s?.total_fee || 0) * c.amount / 100);
                  })()
                : Number(c.amount);

              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors duration-200 group">
                  <div className={`w-10 h-10 rounded-xl ${typeInfo.bg} flex items-center justify-center shrink-0`}>
                    <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body text-sm font-semibold text-foreground">{info?.name || "Unknown"}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${typeInfo.bg} ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                      {info?.roll} · {info?.course} {c.semester ? `· Sem ${c.semester}` : ""} {c.academic_year ? `· ${c.academic_year}` : ""}
                    </p>
                    <p className="font-body text-xs text-foreground/80 mt-1 font-medium">{c.concession_name}</p>
                    {c.reason && <p className="font-body text-[10px] text-muted-foreground mt-0.5 italic">"{c.reason}"</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-base font-bold text-emerald-400 tabular-nums">
                      {c.is_percentage ? `${c.amount}%` : `₹${Number(c.amount).toLocaleString()}`}
                    </p>
                    {c.is_percentage && (
                      <p className="font-body text-[10px] text-muted-foreground">≈ ₹{effectiveAmount.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(c.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="bg-card/60 backdrop-blur-xl border border-amber-500/15 rounded-2xl p-5">
        <h4 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          Concession Guidelines for Administrators
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: "Merit Scholarship", desc: "Award to students with 85%+ marks. Verify academic records before applying." },
            { title: "SC/ST Concession", desc: "Requires valid caste certificate. Verify document before applying government-mandated concession." },
            { title: "EWS / BPL", desc: "Requires income certificate (below ₹8 LPA). Verify annually." },
            { title: "Sports Quota", desc: "For state/national level athletes. Requires sports authority certificate." },
            { title: "Staff Ward", desc: "For children of college staff members. Verify employment status." },
            { title: "Percentage vs Flat", desc: "Use percentage for proportional discounts. Flat amount for fixed concessions." },
          ].map(g => (
            <div key={g.title} className="bg-muted/10 border border-border/30 rounded-xl p-3">
              <p className="font-body text-xs font-semibold text-foreground">{g.title}</p>
              <p className="font-body text-[10px] text-muted-foreground mt-1 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-md rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Tag className="w-4 h-4 text-amber-400" />
              </div>
              {editConcession ? "Edit Concession" : "Add Fee Concession"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Student selector */}
            <div>
              <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Student *</label>
              <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className={inputClass}>
                <option value="">Select student...</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.profile?.full_name || "—"} ({s.roll_number}) — {s.courses?.code || "N/A"}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Concession Type *</label>
              <select value={form.concession_type} onChange={e => setForm({ ...form, concession_type: e.target.value })} className={inputClass}>
                {CONCESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Concession Name *</label>
              <input value={form.concession_name} onChange={e => setForm({ ...form, concession_name: e.target.value })} className={inputClass} placeholder="e.g., Merit Scholarship 2024-25" maxLength={100} />
            </div>

            {/* Amount + type toggle */}
            <div>
              <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">
                {form.is_percentage ? "Percentage (%)" : "Amount (₹)"} *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-xs text-muted-foreground">
                    {form.is_percentage ? "%" : "₹"}
                  </span>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={`${inputClass} pl-7`} placeholder="0" min="0" max={form.is_percentage ? "100" : undefined} />
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_percentage: !form.is_percentage, amount: "" })}
                  className={`px-3 py-2 rounded-xl border text-xs font-body font-semibold transition-all duration-200 shrink-0 ${form.is_percentage
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}
                >
                  {form.is_percentage ? <Percent className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                </button>
              </div>
              <p className="font-body text-[10px] text-muted-foreground mt-1">
                {form.is_percentage ? "Percentage of total fee" : "Fixed amount discount"} · Click icon to toggle
              </p>
            </div>

            {/* Semester & Academic Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Semester</label>
                <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className={inputClass}>
                  <option value="">All Semesters</option>
                  {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
                </select>
              </div>
              <div>
                <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Academic Year</label>
                <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} className={inputClass} placeholder="e.g., 2024-25" maxLength={20} />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="font-body text-[11px] font-semibold block mb-1.5 uppercase tracking-wider text-muted-foreground">Reason / Justification</label>
              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={`${inputClass} min-h-[70px] resize-none`} placeholder="Brief reason for this concession..." maxLength={500} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1 rounded-xl font-body border-border/40">Cancel</Button>
              <Button
                onClick={() => addConcession.mutate()}
                disabled={!form.student_id || !form.concession_name || !form.amount || addConcession.isPending}
                className="flex-1 rounded-xl font-body bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 shadow-lg shadow-primary/20"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                {editConcession ? "Update" : "Add"} Concession
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Remove Concession?</DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-muted-foreground">This will deactivate the concession. It can be re-added later if needed.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl font-body">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteConcession.mutate(deleteConfirm)}
              disabled={deleteConcession.isPending}
              className="flex-1 rounded-xl font-body"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
