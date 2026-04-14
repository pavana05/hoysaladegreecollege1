import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, X, ArrowLeft, GraduationCap, Upload, Star, StarOff, Linkedin, Briefcase, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

const emptyForm = {
  name: "", batch_year: "", course: "", job_title: "",
  company: "", story: "", linkedin_url: "", image_url: "",
  is_featured: false,
};

export default function AdminAlumni() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState("");

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ["admin-alumni"],
    queryFn: async () => {
      const { data } = await supabase.from("alumni_stories").select("*").order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        batch_year: form.batch_year,
        course: form.course,
        job_title: form.job_title,
        company: form.company,
        story: form.story,
        linkedin_url: form.linkedin_url || null,
        image_url: form.image_url || null,
        is_featured: form.is_featured,
      };
      if (editId) {
        const { error } = await supabase.from("alumni_stories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("alumni_stories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Alumni story updated!" : "Alumni story added!");
      queryClient.invalidateQueries({ queryKey: ["admin-alumni"] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alumni_stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alumni story removed!");
      queryClient.invalidateQueries({ queryKey: ["admin-alumni"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("alumni_stories").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alumni"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `alumni/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: publicUrl }));
      setPreviewPhoto(publicUrl);
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (a: any) => {
    setForm({
      name: a.name, batch_year: a.batch_year, course: a.course,
      job_title: a.job_title, company: a.company, story: a.story,
      linkedin_url: a.linkedin_url || "", image_url: a.image_url || "",
      is_featured: a.is_featured || false,
    });
    setPreviewPhoto(a.image_url || "");
    setEditId(a.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setPreviewPhoto("");
  };

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px]" style={{ background: "hsla(var(--gold), 0.08)" }} />
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Alumni Stories
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1">{alumni.length} stories · Manage alumni success stories</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}
            className="rounded-xl font-body text-sm bg-gradient-to-r from-primary to-navy-dark">
            <Plus className="w-4 h-4 mr-2" /> Add Story
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-foreground">
              {editId ? "Edit Alumni Story" : "Add New Alumni Story"}
            </h3>
            <button onClick={resetForm} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Photo Upload */}
            <div className="sm:col-span-2 flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center border border-border overflow-hidden shrink-0">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Photo</label>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all font-body text-sm text-muted-foreground">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="Or paste URL" className={`${inputClass} mt-1`} />
              </div>
            </div>

            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Batch Year *</label>
              <input value={form.batch_year} onChange={e => setForm(f => ({ ...f, batch_year: e.target.value }))} placeholder="e.g. 2020" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course *</label>
              <input value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. BCA" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Job Title *</label>
              <input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Software Engineer" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Company *</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Google" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">LinkedIn URL</label>
              <input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Success Story *</label>
              <textarea value={form.story} onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
                placeholder="Write their journey and achievements..."
                rows={4} className={`${inputClass} resize-none`} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <label className="font-body text-sm text-foreground font-semibold">Featured Story</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${form.is_featured ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${form.is_featured ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-5 pt-4 border-t border-border">
            <Button onClick={() => upsertMutation.mutate()}
              disabled={!form.name || !form.batch_year || !form.course || !form.job_title || !form.company || !form.story || upsertMutation.isPending}
              className="rounded-xl font-body bg-gradient-to-r from-primary to-navy-dark">
              {upsertMutation.isPending ? "Saving..." : editId ? "Update Story" : "Add Story"}
            </Button>
            <Button variant="outline" onClick={resetForm} className="rounded-xl font-body">Cancel</Button>
          </div>
        </div>
      )}

      {/* Alumni Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))
        ) : alumni.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-display text-lg font-bold text-foreground">No alumni stories yet</p>
            <p className="font-body text-sm text-muted-foreground mt-1">Click "Add Story" to get started</p>
          </div>
        ) : (
          alumni.map((a: any, i: number) => (
            <div key={a.id}
              className="bg-card border border-border/40 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 group relative animate-fade-in"
              style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}>
              {a.is_featured && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-body font-bold flex items-center gap-1">
                  <Star className="w-3 h-3" /> Featured
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden border border-border shrink-0">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-foreground leading-tight truncate">{a.name}</h3>
                  <p className="font-body text-xs text-primary font-semibold mt-0.5 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {a.job_title}
                  </p>
                  <p className="font-body text-[11px] text-muted-foreground flex items-center gap-1">
                    <Building className="w-3 h-3" /> {a.company}
                  </p>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                <p className="font-body text-[11px] text-muted-foreground">
                  {a.course} · Batch {a.batch_year}
                </p>
                <p className="font-body text-xs text-muted-foreground line-clamp-2">{a.story}</p>
              </div>
              <div className="flex gap-1.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(a)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleFeatured.mutate({ id: a.id, is_featured: !a.is_featured })}
                  className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary transition-colors" title={a.is_featured ? "Unfeature" : "Feature"}>
                  {a.is_featured ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { if (confirm(`Remove ${a.name}'s story?`)) deleteMutation.mutate(a.id); }}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
