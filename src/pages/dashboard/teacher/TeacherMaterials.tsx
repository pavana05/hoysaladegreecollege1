import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/native-download";
import { toast } from "sonner";
import { Upload, Trash2, ExternalLink, FileText, Download, File, Image, Video, FileArchive } from "lucide-react";
import { notifyStudents } from "@/hooks/useNotifyStudents";
import { IOSPicker } from "@/components/ui/ios-picker";

function fileIcon(url: string) {
  const ext = url?.split(".").pop()?.toLowerCase() || "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return <Image className="w-5 h-5 text-blue-500" />;
  if (["mp4","webm","mov","avi"].includes(ext)) return <Video className="w-5 h-5 text-purple-500" />;
  if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
  if (["doc","docx","ppt","pptx","xls","xlsx"].includes(ext)) return <FileArchive className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

export default function TeacherMaterials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [semester, setSemester] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [semesterFilter, setSemesterFilter] = useState<string>("");

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name").eq("is_active", true);
      return data || [];
    },
  });
  const [courseId, setCourseId] = useState("");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["teacher-materials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("study_materials")
        .select("*, courses(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (materialFiles.length === 0) throw new Error("Please select at least one file");
      setUploading(true);
      const uploaded: string[] = [];

      for (let i = 0; i < materialFiles.length; i++) {
        const file = materialFiles[i];
        setUploadProgress(Math.round(((i) / materialFiles.length) * 100));
        const ext = file.name.split(".").pop();
        const path = `materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, file);
        if (uploadErr) throw new Error(`Upload failed for ${file.name}: ` + uploadErr.message);
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        uploaded.push(urlData.publicUrl);
      }

      // Insert one record per file
      const inserts = uploaded.map((fileUrl, idx) => ({
        title: materialFiles.length > 1 ? `${title} (${idx + 1})` : title,
        subject,
        file_url: fileUrl,
        course_id: courseId || null,
        uploaded_by: user!.id,
        semester: semester ? parseInt(semester) : null,
      }));

      const { error } = await supabase.from("study_materials").insert(inserts);
      if (error) throw error;
      setUploadProgress(100);
    },
    onSuccess: () => {
      toast.success(`${materialFiles.length} file(s) uploaded!`);
      // Notify students
      notifyStudents({
        courseId: courseId || null,
        semester: semester ? parseInt(semester) : null,
        title: "New Study Material",
        message: `${title} - ${subject} has been uploaded.`,
        type: "material",
        link: "/dashboard/student/materials",
      });
      setTitle(""); setSubject(""); setMaterialFiles([]); setCourseId(""); setSemester("");
      setUploading(false); setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ["teacher-materials"] });
    },
    onError: (e: any) => { toast.error(e.message); setUploading(false); setUploadProgress(0); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Material deleted");
      queryClient.invalidateQueries({ queryKey: ["teacher-materials"] });
    },
  });

  const handleDownload = (url: string, title: string) => {
    downloadFile(url, title);
  };

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  const filtered = semesterFilter
    ? materials.filter((m: any) => m.semester === parseInt(semesterFilter))
    : materials;

  const grouped = filtered.reduce((acc: any, m: any) => {
    const key = m.courses?.name || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none" style={{ background: "hsla(var(--gold), 0.08)" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Study Materials</h2>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Upload multiple PDFs, images, videos and files for students</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <h3 className="font-body text-sm font-bold text-foreground mb-4">Upload New Material(s)</h3>
        <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. DBMS Notes" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Subject *</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="e.g. Database Management" className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course</label>
              <IOSPicker
                title="Select Course"
                placeholder="All Courses (General)"
                value={courseId}
                onChange={setCourseId}
                options={[
                  { value: "", label: "All Courses (General)", icon: "🎓", description: "Visible to every course" },
                  ...courses.map((c: any) => ({ value: c.id, label: c.name, icon: "📘" })),
                ]}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Semester</label>
              <IOSPicker
                title="Select Semester"
                placeholder="No Semester"
                value={semester}
                onChange={setSemester}
                options={[
                  { value: "", label: "No Semester", icon: "∞", description: "Applies to all semesters" },
                  ...[1,2,3,4,5,6].map(s => ({ value: String(s), label: `Semester ${s}`, icon: ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣"][s-1] })),
                ]}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                <Upload className="w-3 h-3" /> Upload Files * (multiple allowed)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,video/*"
                required
                onChange={(e) => setMaterialFiles(Array.from(e.target.files || []))}
                className="w-full font-body text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-semibold file:text-xs hover:file:bg-primary/20 cursor-pointer"
              />
              {materialFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {materialFiles.map((f, i) => (
                    <p key={i} className="font-body text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {uploading && (
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <Button type="submit" disabled={uploading || !title || !subject} className="rounded-xl font-body">
            {uploading ? `Uploading ${uploadProgress}%...` : <><Upload className="w-4 h-4 mr-2" /> Upload {materialFiles.length > 1 ? `${materialFiles.length} Files` : "Material"}</>}
          </Button>
        </form>
      </div>

      {/* Semester filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="font-body text-sm font-semibold text-foreground">Filter by Semester:</label>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSemesterFilter("")} className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold border transition-all duration-300 ${!semesterFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>All</button>
          {[1,2,3,4,5,6].map(s => (
            <button key={s} onClick={() => setSemesterFilter(String(s))} className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold border transition-all duration-300 ${semesterFilter === String(s) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
              Sem {s}
            </button>
          ))}
        </div>
      </div>

      {/* Materials grouped by course */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-sm text-muted-foreground">No materials uploaded yet.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([courseName, items]: [string, any]) => (
            <div key={courseName} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <h3 className="font-body text-sm font-bold text-foreground flex items-center gap-2">
                  <BookIcon /> {courseName}
                </h3>
                <span className="font-body text-xs text-muted-foreground">{items.length} file(s)</span>
              </div>
              <div className="divide-y divide-border/50">
                {items.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors group">
                    <div className="shrink-0">{fileIcon(m.file_url || "")}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-semibold text-foreground truncate">{m.title}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {m.subject}{m.semester ? ` • Sem ${m.semester}` : ""} • {new Date(m.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.file_url && (
                        <>
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                            <button className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Open">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </a>
                          <button
                            className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-600 transition-colors"
                            title="Download"
                            onClick={() => handleDownload(m.file_url, m.title)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { if (confirm("Delete this material?")) deleteMutation.mutate(m.id); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BookIcon() {
  return (
    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
