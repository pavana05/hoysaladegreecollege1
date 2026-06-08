import { useState } from "react";
import { IOSSelect } from "@/components/ui/ios-select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, ArrowLeft, Image, Link2, ToggleLeft, ToggleRight, Megaphone, FileText, Book, X, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";

// ===== Popup Banners =====
function PopupBannerManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", link_url: "" });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data } = await supabase.from("popup_banners").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addBanner = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title is required");
      setUploading(true);
      let image_url = "";
      if (imgFile) {
        const ext = imgFile.name.split(".").pop();
        const path = `banners/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("uploads").upload(path, imgFile);
        if (upErr) throw new Error("Image upload failed");
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
      const { error } = await supabase.from("popup_banners").insert({ ...form, image_url, posted_by: user?.id, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["popup-banners"] });
      toast.success("Banner added! It will appear as a popup on the main website.");
      setForm({ title: "", link_url: "" }); setImgFile(null); setUploading(false);
    },
    onError: (e: any) => { toast.error(e.message); setUploading(false); },
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("popup_banners").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); qc.invalidateQueries({ queryKey: ["popup-banners"] }); },
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("popup_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); qc.invalidateQueries({ queryKey: ["popup-banners"] }); toast.success("Deleted"); },
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-display text-base font-bold text-foreground mb-1 flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" /> Add New Popup Banner
        </h3>
        <p className="font-body text-xs text-muted-foreground mb-4">This banner will appear as a popup when visitors open the main website.</p>
        <form onSubmit={(e) => { e.preventDefault(); addBanner.mutate(); }} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Banner Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className={inputClass} placeholder="e.g. Admission Open 2026!" />
          </div>
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5 flex items-center gap-1"><Link2 className="w-3 h-3" /> Link URL (optional)</label>
            <input value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} className={inputClass} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <label className="font-body text-xs font-semibold block mb-1.5 flex items-center gap-1"><Upload className="w-3 h-3" /> Banner Image / Video</label>
            <input type="file" accept="image/*,video/*" onChange={e => setImgFile(e.target.files?.[0] || null)}
              className="w-full font-body text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:text-xs hover:file:bg-primary/20 cursor-pointer" />
            {imgFile && <p className="font-body text-xs text-muted-foreground mt-1">📎 {imgFile.name}</p>}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={uploading} className="rounded-xl font-body">
              {uploading ? "Uploading..." : <><Plus className="w-4 h-4 mr-2" /> Add Banner</>}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-body text-sm font-bold text-foreground mb-4">Current Banners ({banners.length})</h3>
        {isLoading ? <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        : banners.length === 0 ? <p className="text-center font-body text-sm text-muted-foreground py-6">No banners added yet.</p>
        : (
          <div className="space-y-3">
            {banners.map((b: any) => (
              <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:shadow-md transition-all group">
                {b.image_url ? <img src={b.image_url} alt="" className="w-16 h-12 rounded-lg object-cover border border-border" /> : <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center"><Image className="w-5 h-5 text-muted-foreground" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground truncate">{b.title}</p>
                  {b.link_url && <p className="font-body text-xs text-primary truncate">{b.link_url}</p>}
                  <p className="font-body text-xs text-muted-foreground">{format(new Date(b.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleBanner.mutate({ id: b.id, active: !b.is_active })}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-body font-semibold transition-colors ${b.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {b.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {b.is_active ? "Live" : "Hidden"}
                  </button>
                  <button onClick={() => { if (confirm("Delete this banner?")) deleteBanner.mutate(b.id); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Previous Year Papers =====
function PreviousYearPapers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", course: "BCA", subject: "", year: "2024-25", semester: "1" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ["admin-papers"],
    queryFn: async () => {
      const { data } = await supabase.from("previous_year_papers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addPaper = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please select a file");
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `papers/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file);
      if (upErr) throw new Error("Upload failed");
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const { error } = await supabase.from("previous_year_papers").insert({
        ...form, semester: parseInt(form.semester), file_url: urlData.publicUrl, posted_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-papers"] });
      qc.invalidateQueries({ queryKey: ["public-papers"] });
      toast.success("Question paper uploaded! It will appear on the public page.");
      setForm({ title: "", course: "BCA", subject: "", year: "2024-25", semester: "1" });
      setFile(null); setUploading(false);
    },
    onError: (e: any) => { toast.error(e.message); setUploading(false); },
  });

  const deletePaper = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("previous_year_papers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-papers"] }); toast.success("Deleted"); },
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Book className="w-4 h-4 text-primary" /> Upload Question Paper
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); addPaper.mutate(); }} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className={inputClass} placeholder="e.g. BCA Programming 2024" />
          </div>
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Course *</label>
            <IOSSelect value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={inputClass}>
              {["BCA", "B.Com Regular", "B.Com Professional", "BBA"].map(c => <option key={c}>{c}</option>)}
            </IOSSelect>
          </div>
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Subject *</label>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required className={inputClass} placeholder="e.g. Data Structures" />
          </div>
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Year *</label>
            <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} required className={inputClass} placeholder="e.g. 2024-25" />
          </div>
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5">Semester</label>
            <IOSSelect value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className={inputClass}>
              {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </IOSSelect>
          </div>
          <div>
            <label className="font-body text-xs font-semibold block mb-1.5 flex items-center gap-1"><Upload className="w-3 h-3" /> PDF File *</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} required
              className="w-full font-body text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:text-xs hover:file:bg-primary/20 cursor-pointer" />
            {file && <p className="font-body text-xs text-muted-foreground mt-1">📎 {file.name}</p>}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={uploading} className="rounded-xl font-body">
              {uploading ? "Uploading..." : <><Plus className="w-4 h-4 mr-2" /> Upload Paper</>}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-body text-sm font-bold text-foreground mb-4">Uploaded Papers ({papers.length})</h3>
        {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        : papers.length === 0 ? <p className="text-center font-body text-sm text-muted-foreground py-6">No papers uploaded yet.</p>
        : (
          <div className="space-y-3">
            {papers.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground truncate">{p.title}</p>
                  <p className="font-body text-xs text-muted-foreground">{p.course} • Sem {p.semester} • {p.year} • {p.subject}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                    <Eye className="w-4 h-4" />
                  </a>
                  <button onClick={() => { if (confirm("Delete?")) deletePaper.mutate(p.id); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Main Component =====
export default function AdminBannerAndPapers() {
  const [tab, setTab] = useState<"banners" | "papers">("banners");

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <BackButton />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" /> Content Management
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-0.5">Manage popup banners and previous year question papers</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {[{ key: "banners", label: "Popup Banners", icon: Image }, { key: "papers", label: "Question Papers", icon: Book }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-sm font-semibold transition-all ${
              tab === key ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "banners" ? <PopupBannerManager /> : <PreviousYearPapers />}
    </div>
  );
}
