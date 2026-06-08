import { useState } from "react";
import { IOSSelect } from "@/components/ui/ios-select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Image, Plus, Trash2, Edit2, X, ArrowLeft, FolderOpen, Upload, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import BackButton from "@/components/BackButton";

const CATEGORIES = ["Campus", "Facilities", "Academics", "Events", "Sports", "Cultural", "Other"];

export default function AdminGallery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Campus", album_name: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => {
      const { data } = await supabase.from("gallery_images").select("*").order("sort_order").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Derive albums
  const albums = Array.from(new Set(images.filter((img: any) => img.album_name).map((img: any) => img.album_name))) as string[];
  const filteredImages = activeAlbum ? images.filter((img: any) => img.album_name === activeAlbum) : images;

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (files.length === 0 && !editingId) { toast.error("Please select at least one image"); return; }
    setUploading(true);
    try {
      if (editingId) {
        // Single edit
        let imageUrl = "";
        if (files.length > 0) {
          const file = files[0];
          const ext = file.name.split(".").pop();
          const path = `gallery/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, file);
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
        const updateData: any = { title: form.title, description: form.description, category: form.category, album_name: form.album_name || null };
        if (imageUrl) updateData.image_url = imageUrl;
        await supabase.from("gallery_images").update(updateData).eq("id", editingId);
        toast.success("Image updated!");
      } else {
        // Multi-upload
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = file.name.split(".").pop();
          const path = `gallery/${Date.now()}_${i}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, file);
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
          const title = files.length > 1 ? `${form.title} (${i + 1})` : form.title;
          await supabase.from("gallery_images").insert({
            title,
            description: form.description,
            category: form.category,
            image_url: urlData.publicUrl,
            posted_by: user?.id,
            album_name: form.album_name || null,
          });
        }
        toast.success(`${files.length} image${files.length > 1 ? "s" : ""} added to gallery!`);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
      resetForm();
    } catch (err: any) { toast.error(err.message || "Upload failed"); } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gallery image?")) return;
    await supabase.from("gallery_images").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    toast.success("Image deleted");
  };

  const handleEdit = (img: any) => {
    setForm({ title: img.title, description: img.description || "", category: img.category, album_name: img.album_name || "" });
    setEditingId(img.id); setShowForm(true);
  };

  const resetForm = () => { setForm({ title: "", description: "", category: "Campus", album_name: "" }); setFiles([]); setEditingId(null); setShowForm(false); };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("gallery_images").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    toast.success(active ? "Image hidden" : "Image visible");
  };

  const inputClass = "w-full border border-border/60 rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] bg-primary/[0.08]" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Gallery Management</h2>
              <p className="font-body text-sm text-muted-foreground">Upload and manage gallery images & albums</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl font-body">
            <Plus className="w-4 h-4 mr-2" /> Add Images
          </Button>
        </div>
      </div>

      {/* Album Tabs */}
      {albums.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveAlbum(null)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-body text-xs font-semibold border transition-all ${
              activeAlbum === null ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border/60 text-muted-foreground hover:border-primary/30"
            }`}
          >
            <Images className="w-3.5 h-3.5" /> All ({images.length})
          </button>
          {albums.map(album => {
            const count = images.filter((img: any) => img.album_name === album).length;
            return (
              <button key={album} onClick={() => setActiveAlbum(album)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-body text-xs font-semibold border transition-all ${
                  activeAlbum === album ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border/60 text-muted-foreground hover:border-primary/30"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" /> {album} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border/40 rounded-3xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold">{editingId ? "Edit Image" : "Add New Images"}</h3>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-muted-foreground mb-1 block">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Campus Building" />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
              <IOSSelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </IOSSelect>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-muted-foreground mb-1 block">Album Name <span className="text-muted-foreground/50">(optional — groups into folder)</span></label>
              <input value={form.album_name} onChange={(e) => setForm({ ...form, album_name: e.target.value })} className={inputClass} placeholder="e.g. Graduation Day & Sangama-2025" />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="Optional description" />
            </div>
            <div className="sm:col-span-2">
              <label className="font-body text-xs font-semibold text-muted-foreground mb-1 block">
                {editingId ? "Image (leave empty to keep current)" : "Images *"}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple={!editingId}
                onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                className="w-full border border-border/60 rounded-xl px-3 py-2 font-body text-sm bg-background file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:text-xs"
              />
              {files.length > 1 && (
                <p className="font-body text-xs text-muted-foreground mt-1">
                  <Upload className="w-3 h-3 inline mr-1" />{files.length} files selected — each will be uploaded with the title + number suffix
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={uploading} className="mt-4 rounded-xl font-body">
            {uploading ? "Uploading..." : editingId ? "Update Image" : `Upload ${files.length > 1 ? files.length + " Images" : "Image"}`}
          </Button>
        </div>
      )}

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />)}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/40 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Image className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="font-display text-lg font-semibold text-muted-foreground">
            {activeAlbum ? `No images in "${activeAlbum}"` : "No gallery images yet"}
          </p>
          <p className="font-body text-sm text-muted-foreground/60 mt-1">Click "Add Images" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img: any, i: number) => (
            <div key={img.id}
              draggable
              onDragStart={() => setDraggedId(img.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(img.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverId(null);
                if (!draggedId || draggedId === img.id) return;
                const allImgs = [...filteredImages];
                const fromIdx = allImgs.findIndex((x: any) => x.id === draggedId);
                const toIdx = allImgs.findIndex((x: any) => x.id === img.id);
                if (fromIdx === -1 || toIdx === -1) return;
                const [moved] = allImgs.splice(fromIdx, 1);
                allImgs.splice(toIdx, 0, moved);
                for (let j = 0; j < allImgs.length; j++) {
                  await supabase.from("gallery_images").update({ sort_order: j }).eq("id", (allImgs[j] as any).id);
                }
                setDraggedId(null);
                queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
                toast.success("Order updated");
              }}
              onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
              className={`relative group rounded-3xl border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in cursor-grab active:cursor-grabbing ${
                img.is_active ? "border-border/40" : "border-destructive/30 opacity-60"
              } ${dragOverId === img.id ? "ring-2 ring-primary scale-[1.02]" : ""} ${draggedId === img.id ? "opacity-50" : ""}`}
              style={{ animationDelay: `${i * 50}ms`, opacity: 0, animationFillMode: 'forwards' }}>
              <div className="aspect-[4/3]">
                <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex gap-1 flex-wrap mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/90 text-primary-foreground font-body font-bold">{img.category}</span>
                  {img.album_name && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-body font-bold">{img.album_name}</span>
                  )}
                </div>
                <p className="font-display text-sm font-bold text-white mt-1 truncate">{img.title}</p>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => handleEdit(img)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(img.id, img.is_active)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold font-body">{img.is_active ? "Hide" : "Show"}</button>
                  <button onClick={() => handleDelete(img.id)} className="p-1.5 rounded-lg bg-destructive/60 hover:bg-destructive/80 text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {!img.is_active && (
                <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-destructive/80 text-white font-body font-bold">Hidden</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
