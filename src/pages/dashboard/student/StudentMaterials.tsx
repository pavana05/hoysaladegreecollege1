import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Download, ExternalLink, FileText, Image, Video, File, FileArchive, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { downloadFile } from "@/lib/native-download";

function fileIcon(url: string) {
  const ext = url?.split(".").pop()?.toLowerCase() || "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return <Image className="w-6 h-6 text-blue-500" />;
  if (["mp4","webm","mov","avi"].includes(ext)) return <Video className="w-6 h-6 text-purple-500" />;
  if (ext === "pdf") return <FileText className="w-6 h-6 text-red-500" />;
  if (["doc","docx","ppt","pptx","xls","xlsx"].includes(ext)) return <FileArchive className="w-6 h-6 text-green-500" />;
  return <File className="w-6 h-6 text-muted-foreground" />;
}

function fileBadge(url: string) {
  const ext = url?.split(".").pop()?.toLowerCase() || "file";
  const map: Record<string, { label: string; cls: string }> = {
    pdf: { label: "PDF", cls: "bg-red-500/10 text-red-500" },
    jpg: { label: "Image", cls: "bg-blue-500/10 text-blue-500" },
    jpeg: { label: "Image", cls: "bg-blue-500/10 text-blue-500" },
    png: { label: "Image", cls: "bg-blue-500/10 text-blue-500" },
    mp4: { label: "Video", cls: "bg-purple-500/10 text-purple-500" },
    doc: { label: "DOC", cls: "bg-green-500/10 text-green-500" },
    docx: { label: "DOCX", cls: "bg-green-500/10 text-green-500" },
    ppt: { label: "PPT", cls: "bg-orange-500/10 text-orange-500" },
    pptx: { label: "PPT", cls: "bg-orange-500/10 text-orange-500" },
    xls: { label: "Excel", cls: "bg-emerald-500/10 text-emerald-500" },
    xlsx: { label: "Excel", cls: "bg-emerald-500/10 text-emerald-500" },
  };
  const info = map[ext] || { label: ext.toUpperCase(), cls: "bg-muted text-muted-foreground" };
  return <span className={`font-body text-[10px] font-bold px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>;
}

export default function StudentMaterials() {
  const [search, setSearch] = useState("");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["student-materials"],
    queryFn: async () => {
      const { data } = await supabase.from("study_materials").select("*, courses(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleDownload = (url: string, title: string) => {
    downloadFile(url, title);
  };

  const filtered = materials.filter((m: any) => {
    const q = search.toLowerCase();
    return !q || m.title?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q) || m.courses?.name?.toLowerCase().includes(q);
  });

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
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] bg-primary/[0.08]" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Study Materials</h2>
              <p className="font-body text-sm text-muted-foreground">Access and download study materials uploaded by your teachers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search materials, subjects or courses..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-2xl border-border/60 focus:border-primary/30 h-11" />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted/50 rounded-3xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-3xl p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-1">No Materials Found</h3>
          <p className="font-body text-sm text-muted-foreground">No study materials available yet. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([courseName, items]: [string, any], gi: number) => (
            <div key={courseName} className="bg-card border border-border/40 rounded-3xl overflow-hidden animate-fade-in"
              style={{ animationDelay: `${gi * 80}ms`, opacity: 0, animationFillMode: 'forwards' }}>
              <div className="relative px-6 py-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] to-secondary/[0.03]" />
                <div className="relative flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> {courseName}
                  </h3>
                  <span className="font-body text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/40">
                    {items.length} file{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/30">
                {items.map((m: any, idx: number) => (
                  <div key={m.id} className={`p-5 hover:bg-muted/20 transition-all duration-300 group ${idx !== 0 && idx % 2 === 0 ? "sm:col-span-2 sm:divide-y sm:divide-border/30" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-center shrink-0 group-hover:bg-primary/[0.08] group-hover:border-primary/20 transition-all duration-300">
                        {fileIcon(m.file_url || "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-body text-sm font-semibold text-foreground">{m.title}</h4>
                          {m.file_url && fileBadge(m.file_url)}
                        </div>
                        <p className="font-body text-xs text-muted-foreground">{m.subject}</p>
                        <p className="font-body text-[10px] text-muted-foreground/70 mt-0.5">
                          {new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {m.file_url && (
                      <div className="flex gap-2 mt-3 ml-14">
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 font-body text-xs font-semibold">
                            <ExternalLink className="w-3 h-3" /> Open
                          </button>
                        </a>
                        <button onClick={() => handleDownload(m.file_url, m.title)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-secondary hover:text-secondary-foreground hover:border-secondary hover:shadow-lg transition-all duration-300 font-body text-xs font-semibold">
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
