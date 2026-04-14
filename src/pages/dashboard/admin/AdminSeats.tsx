import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Users } from "lucide-react";
import { Link } from "react-router-dom";
import BackButton from "@/components/BackButton";

const COURSE_LABELS: Record<string, string> = {
  BCA: "BCA (Computer Applications)",
  BCOM: "B.Com Regular",
  BCOM_PROF: "B.Com Professional",
  BBA: "BBA (Business Administration)",
};

export default function AdminSeats() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: seats = [], isLoading } = useQuery({
    queryKey: ["admin-seats"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("admission_seats").select("*").order("course_code");
      return data || [];
    },
  });

  const [edits, setEdits] = useState<Record<string, number>>({});

  const saveMutation = useMutation({
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

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-center font-bold text-lg";

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="relative overflow-hidden bg-gradient-to-r from-secondary/10 via-card to-primary/8 border border-border rounded-2xl p-5 sm:p-6">
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" /> Manage Available Seats
            </h2>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Update the seat count shown on the Admissions page</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        {isLoading ? (
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
                    className={inputClass}
                  />
                </div>
                <span className="font-body text-xs text-muted-foreground shrink-0">seats</span>
              </div>
            ))}
            <Button onClick={() => saveMutation.mutate()} disabled={Object.keys(edits).length === 0 || saveMutation.isPending}
              className="w-full rounded-xl font-body shadow-md mt-4">
              <Save className="w-4 h-4 mr-2" /> {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
