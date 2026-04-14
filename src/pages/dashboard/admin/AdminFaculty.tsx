import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, X, ArrowLeft, GraduationCap, Upload, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

const emptyForm = {
  name: "", role: "", department: "", qualification: "",
  experience: "", email: "", phone: "", photo_url: "",
  subjects: "", is_active: true, sort_order: 0,
};

export default function AdminFaculty() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string>("");

  const { data: faculty = [], isLoading } = useQuery({
    queryKey: ["admin-faculty"],
    queryFn: async () => {
      const { data } = await supabase.from("faculty_members").select("*").order("sort_order").order("created_at");
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        role: form.role,
        department: form.department,
        qualification: form.qualification,
        experience: form.experience,
        email: form.email,
        phone: form.phone,
        photo_url: form.photo_url,
        subjects: form.subjects ? form.subjects.split(",").map(s => s.trim()).filter(Boolean) : [],
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
        posted_by: user!.id,
      };
      if (editId) {
        const { error } = await supabase.from("faculty_members").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faculty_members").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Faculty member updated!" : "Faculty member added!");
      queryClient.invalidateQueries({ queryKey: ["admin-faculty"] });
      setForm(emptyForm); setEditId(null); setShowForm(false); setPreviewPhoto("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faculty_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faculty member removed!");
      queryClient.invalidateQueries({ queryKey: ["admin-faculty"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("faculty_members").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faculty"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `faculty/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: publicUrl }));
      setPreviewPhoto(publicUrl);
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (f: any) => {
    setForm({
      name: f.name, role: f.role, department: f.department,
      qualification: f.qualification, experience: f.experience,
      email: f.email || "", phone: f.phone || "",
      photo_url: f.photo_url || "", subjects: (f.subjects || []).join(", "),
      is_active: f.is_active, sort_order: f.sort_order || 0,
    });
    setPreviewPhoto(f.photo_url || "");
    setEditId(f.id);
    setShowForm(true);
  };

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Faculty Management
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1">{faculty.length} faculty members · Changes appear on the public website</p>
            </div>
          </div>
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setPreviewPhoto(""); setShowForm(true); }}
            className="rounded-xl font-body text-sm bg-gradient-to-r from-primary to-navy-dark">
            <Plus className="w-4 h-4 mr-2" /> Add Faculty
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-foreground">
              {editId ? "Edit Faculty Member" : "Add New Faculty Member"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setPreviewPhoto(""); }}
              className="p-2 rounded-xl hover:bg-muted transition-colors">
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
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Profile Photo</label>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all font-body text-sm text-muted-foreground">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <p className="font-body text-[10px] text-muted-foreground mt-1">Or paste URL below</p>
                <input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
                  placeholder="https://... or upload above" className={`${inputClass} mt-1`} />
              </div>
            </div>

            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Rajesh Kumar" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Designation / Role *</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Associate Professor" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Department *</label>
              <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Computer Applications" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Qualification *</label>
              <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="e.g. Ph.D. in Computer Science" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Experience *</label>
              <input value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="e.g. 15 years" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Subjects (comma separated)</label>
              <input value={form.subjects} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))} placeholder="e.g. Data Structures, DBMS" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="faculty@email.com" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Sort Order (lower = first)</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="font-body text-sm text-foreground font-semibold">Visible on Website</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${form.is_active ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${form.is_active ? "left-5.5 left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-5 pt-4 border-t border-border">
            <Button onClick={() => upsertMutation.mutate()} disabled={!form.name || !form.role || !form.department || upsertMutation.isPending}
              className="rounded-xl font-body bg-gradient-to-r from-primary to-navy-dark">
              {upsertMutation.isPending ? "Saving..." : editId ? "Update Faculty" : "Add Faculty"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setPreviewPhoto(""); }}
              className="rounded-xl font-body">Cancel</Button>
          </div>
        </div>
      )}

      {/* Faculty Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))
        ) : faculty.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-display text-lg font-bold text-foreground">No faculty members yet</p>
            <p className="font-body text-sm text-muted-foreground mt-1">Click "Add Faculty" to get started</p>
          </div>
        ) : (
          faculty.map((f: any) => (
            <div key={f.id} className={`bg-card border rounded-2xl p-5 hover:shadow-lg transition-all duration-300 group relative ${f.is_active ? "border-border" : "border-border/50 opacity-60"}`}>
              {!f.is_active && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-body font-semibold">Hidden</div>
              )}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-3 overflow-hidden border border-border">
                  {f.photo_url ? (
                    <img src={f.photo_url} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h3 className="font-display text-sm font-bold text-foreground leading-tight">{f.name}</h3>
                <p className="font-body text-xs text-secondary font-semibold mt-0.5">{f.role}</p>
                <p className="font-body text-[11px] text-muted-foreground mt-0.5">{f.department}</p>
              </div>
              <div className="text-center space-y-1 mb-4">
                <p className="font-body text-[11px] text-muted-foreground">{f.qualification}</p>
                <p className="font-body text-[11px] text-muted-foreground">{f.experience} experience</p>
              </div>
              <div className="flex gap-1.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(f)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive.mutate({ id: f.id, is_active: !f.is_active })}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title={f.is_active ? "Hide" : "Show"}>
                  {f.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { if (confirm(`Remove ${f.name}?`)) deleteMutation.mutate(f.id); }}
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
