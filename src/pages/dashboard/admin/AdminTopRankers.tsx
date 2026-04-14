import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Trash2, Upload, ArrowLeft, Star, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/BackButton";

const rankColors = ["from-secondary/20 to-secondary/5 border-secondary/30", "from-muted to-muted/30 border-border", "from-amber-900/10 to-amber-900/3 border-amber-900/20"];
const rankEmoji = ["🥇", "🥈", "🥉"];

export default function AdminTopRankers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ student_name: "", course: "", rank: "1", year: "2024-25" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: rankers = [], isLoading } = useQuery({
    queryKey: ["admin-top-rankers"],
    queryFn: async () => {
      const { data } = await supabase.from("top_students").select("*").order("rank");
      return data || [];
    },
  });

  const addRanker = useMutation({
    mutationFn: async () => {
      if (!photoFile) throw new Error("Photo is required");
      setUploading(true);
      const ext = photoFile.name.split(".").pop();
      const path = `rankers/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, photoFile);
      if (uploadErr) throw new Error("Photo upload failed: " + uploadErr.message);
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const { error } = await supabase.from("top_students").insert({
        student_name: form.student_name,
        course: form.course,
        rank: parseInt(form.rank),
        year: form.year,
        photo_url: urlData.publicUrl,
        posted_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-top-rankers"] });
      qc.invalidateQueries({ queryKey: ["achievements-top-students"] });
      toast.success("Top ranker added! Will appear on the Achievements page.");
      setForm({ student_name: "", course: "", rank: "1", year: "2024-25" });
      setPhotoFile(null); setPreview(null); setUploading(false);
    },
    onError: (e: any) => { toast.error("Failed: " + e.message); setUploading(false); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("top_students").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-top-rankers"] }); toast.success("Updated"); },
  });

  const deleteRanker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("top_students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-top-rankers"] }); toast.success("Deleted"); },
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setPhotoFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else setPreview(null);
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-secondary/10 via-card to-primary/8 border border-border rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-secondary" /> Upload Top Rankers
            </h2>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Add achievers — they appear on the Achievements page & homepage</p>
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-300 card-interactive">
        <h3 className="font-display text-sm font-bold text-foreground mb-5 flex items-center gap-2">
          <Star className="w-4 h-4 text-secondary" /> Add New Top Ranker
        </h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!photoFile) { toast.error("Please upload a photo — it's required"); return; }
          addRanker.mutate();
        }} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Student Name *</label>
            <input value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} required className={inputClass} placeholder="Full name" />
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course & Percentage *</label>
            <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required placeholder="e.g. B.Com - 98.14%" className={inputClass} />
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Rank *</label>
            <select value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} required className={inputClass}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Rank {n} {rankEmoji[n-1] || ""}</option>)}
            </select>
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Year / Batch *</label>
            <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required placeholder="e.g. 2024-25" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
              <Upload className="w-3 h-3" /> Upload Student Photo * (Required)
            </label>
            <div className="flex items-center gap-4">
              {preview && <img src={preview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-border shadow-md" />}
              <input type="file" accept="image/*" onChange={handleFileChange} required
                className="flex-1 font-body text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:text-xs hover:file:bg-primary/20 cursor-pointer" />
            </div>
            {photoFile && <p className="font-body text-xs text-muted-foreground mt-1.5">📎 {photoFile.name}</p>}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={uploading} className="font-body rounded-xl shadow-md hover:shadow-lg transition-all">
              {uploading ? (
                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</span>
              ) : <><Plus className="w-4 h-4 mr-2" /> Add Ranker</>}
            </Button>
          </div>
        </form>
      </div>

      {/* Rankers List */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
        <h3 className="font-display text-sm font-bold text-foreground mb-5">Current Top Rankers ({rankers.length})</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : rankers.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-body text-sm text-muted-foreground">No rankers added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankers.map((r: any, i: number) => {
              const gradClass = rankColors[r.rank - 1] || "from-muted to-muted/30 border-border";
              return (
                <div key={r.id} className={`flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r ${gradClass} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center gap-3">
                    {r.photo_url ? (
                      <img src={r.photo_url} alt={r.student_name} className="w-14 h-14 rounded-xl object-cover border-2 border-white/50 shadow-md" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center text-2xl shadow-inner">
                        {rankEmoji[r.rank - 1] || "🏆"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{rankEmoji[r.rank - 1] || `#${r.rank}`}</span>
                        <p className="font-body text-sm font-bold text-foreground">{r.student_name}</p>
                      </div>
                      <p className="font-body text-xs text-muted-foreground">{r.course}</p>
                      <p className="font-body text-[10px] text-muted-foreground/60">{r.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive.mutate({ id: r.id, active: !r.is_active })}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-body font-semibold transition-colors ${r.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {r.is_active ? <><Eye className="w-3 h-3" /> Active</> : <><EyeOff className="w-3 h-3" /> Hidden</>}
                    </button>
                    <button onClick={() => { if (confirm(`Delete ${r.student_name}?`)) deleteRanker.mutate(r.id); }}
                      className="p-1.5 rounded-xl hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
