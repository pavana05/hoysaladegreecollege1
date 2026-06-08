import { supabase } from "@/integrations/supabase/client";
import { IOSSelect } from "@/components/ui/ios-select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar, Plus, CheckCircle, Star, Trash2, ArrowUpCircle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminAcademicYear() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showPromote, setShowPromote] = useState(false);
  const [promoteFrom, setPromoteFrom] = useState(1);

  const { data: years = [], isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_years").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!label.trim()) throw new Error("Label is required");
      const { error } = await supabase.from("academic_years").insert({
        label: label.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Academic year created!");
      setLabel(""); setStartDate(""); setEndDate(""); setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (yearId: string) => {
      // Unset all first
      await supabase.from("academic_years").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("academic_years").update({ is_current: true }).eq("id", yearId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Current academic year updated!");
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (yearId: string) => {
      const { error } = await supabase.from("academic_years").delete().eq("id", yearId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted!");
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Bulk promote students by year level
  const promoteMutation = useMutation({
    mutationFn: async () => {
      if (promoteFrom >= 3) throw new Error("Cannot promote 3rd year students further");
      const { data: studentsToPromote, error: fetchErr } = await supabase
        .from("students")
        .select("id")
        .eq("year_level", promoteFrom)
        .eq("is_active", true);
      if (fetchErr) throw fetchErr;
      if (!studentsToPromote || studentsToPromote.length === 0) throw new Error("No students found in this year level");

      const ids = studentsToPromote.map(s => s.id);
      const { error } = await supabase
        .from("students")
        .update({ year_level: promoteFrom + 1 })
        .in("id", ids);
      if (error) throw error;
      return studentsToPromote.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} students promoted from Year ${promoteFrom} to Year ${promoteFrom + 1}!`);
      setShowPromote(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-border rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Academic Year Management
        </h2>
        <p className="font-body text-sm text-muted-foreground mt-1">Create academic sessions, set current year, and bulk-promote students</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowCreate(true)} className="rounded-xl font-body">
          <Plus className="w-4 h-4 mr-2" /> Create Academic Year
        </Button>
        <Button variant="outline" onClick={() => setShowPromote(true)} className="rounded-xl font-body">
          <ArrowUpCircle className="w-4 h-4 mr-2" /> Bulk Year Promotion
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Create Academic Year</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Label *</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 2026-2027" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!label.trim() || createMutation.isPending} className="w-full rounded-xl font-body">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={showPromote} onOpenChange={setShowPromote}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Bulk Year Level Promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="font-body text-sm text-muted-foreground">Promote all active students from one year level to the next.</p>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Promote From</label>
              <IOSSelect value={promoteFrom} onChange={(e) => setPromoteFrom(parseInt(e.target.value))} className="w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value={1}>1st Year → 2nd Year</option>
                <option value={2}>2nd Year → 3rd Year</option>
              </IOSSelect>
            </div>
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3">
              <p className="font-body text-xs text-foreground font-semibold">⚠️ This will move ALL active students from Year {promoteFrom} to Year {promoteFrom + 1}.</p>
            </div>
            <Button onClick={() => promoteMutation.mutate()} disabled={promoteMutation.isPending} className="w-full rounded-xl font-body">
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              {promoteMutation.isPending ? "Promoting..." : `Promote Year ${promoteFrom} → Year ${promoteFrom + 1}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Academic Years List */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4">Academic Years</h3>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : years.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">No academic years created yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {years.map((yr: any) => (
              <div key={yr.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${yr.is_current ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border hover:bg-muted/50"}`}>
                <div className="flex items-center gap-3">
                  {yr.is_current && <Star className="w-4 h-4 text-secondary fill-secondary shrink-0" />}
                  <div>
                    <p className="font-body text-sm font-semibold text-foreground flex items-center gap-2">
                      {yr.label}
                      {yr.is_current && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">CURRENT</span>}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      {yr.start_date ? new Date(yr.start_date).toLocaleDateString() : "—"} to {yr.end_date ? new Date(yr.end_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!yr.is_current && (
                    <Button size="sm" variant="outline" onClick={() => setCurrentMutation.mutate(yr.id)} className="rounded-xl font-body text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" /> Set Current
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this academic year?")) deleteMutation.mutate(yr.id); }} className="rounded-xl text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
