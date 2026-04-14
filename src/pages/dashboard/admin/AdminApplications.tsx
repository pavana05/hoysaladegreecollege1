import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye, CheckCircle, XCircle, FileText, X, Phone, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/BackButton";

// Helper to get signed URL for admission photos stored in private bucket
const getAdmissionPhotoUrl = async (photoPath: string): Promise<string | null> => {
  if (!photoPath) return null;
  // If it's already a full URL (legacy data from public bucket), return as-is
  if (photoPath.startsWith("http")) return photoPath;
  const { data, error } = await supabase.storage
    .from("admission-photos")
    .createSignedUrl(photoPath, 3600); // 1 hour expiry
  if (error) return null;
  return data.signedUrl;
};

const statusColor = (s: string) =>
  s === "approved" ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
  : s === "rejected" ? "text-destructive bg-destructive/8 border border-destructive/20"
  : "text-amber-700 bg-amber-50 border border-amber-200";

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data } = await supabase.from("admission_applications").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Resolve signed URLs for admission photos in the table
  useEffect(() => {
    const resolvePhotos = async () => {
      const urls: Record<string, string> = {};
      for (const app of apps) {
        if (app.photo_url) {
          const url = await getAdmissionPhotoUrl(app.photo_url);
          if (url) urls[app.id] = url;
        }
      }
      setPhotoUrls(urls);
    };
    if (apps.length > 0) resolvePhotos();
  }, [apps]);

  // Resolve photo for selected application
  useEffect(() => {
    if (selected?.photo_url) {
      getAdmissionPhotoUrl(selected.photo_url).then(setSelectedPhotoUrl);
    } else {
      setSelectedPhotoUrl(null);
    }
  }, [selected]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, email, fullName, applicationNumber }: { id: string; status: string; email: string; fullName: string; applicationNumber: string }) => {
      const { error } = await supabase.from("admission_applications").update({ status }).eq("id", id);
      if (error) throw error;
      try {
        await supabase.functions.invoke("send-application-email", {
          body: { email, fullName, applicationNumber, status },
        });
      } catch (emailErr) {
        console.warn("Email notification failed:", emailErr);
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`Application ${vars.status}! Email notification sent.`);
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleStatusChange = (app: any, status: string) => {
    updateStatus.mutate({ id: app.id, status, email: app.email, fullName: app.full_name, applicationNumber: app.application_number || "" });
  };

  const filtered = apps.filter((a: any) => {
    const matchSearch = a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.application_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchCourse = courseFilter === "all" || a.course === courseFilter;
    return matchSearch && matchStatus && matchCourse;
  });

  const uniqueCourses = [...new Set(apps.map((a: any) => a.course))];
  const pendingCount = apps.filter((a: any) => a.status === "pending").length;
  const approvedCount = apps.filter((a: any) => a.status === "approved").length;
  const rejectedCount = apps.filter((a: any) => a.status === "rejected").length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/8 via-card to-secondary/8 border border-border rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Admission Applications
            </h2>
            <p className="font-body text-xs text-muted-foreground mt-0.5">{apps.length} total applications</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap ml-11">
          <span className="text-[10px] font-body px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary-foreground font-bold">⏳ {pendingCount} Pending</span>
          <span className="text-[10px] font-body px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">✓ {approvedCount} Approved</span>
          <span className="text-[10px] font-body px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive font-bold">✗ {rejectedCount} Rejected</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, email or app number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none">
          <option value="all">All Courses</option>
          {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["App #", "Applicant", "Course", "Phone", "Date", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider p-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-4"><Skeleton className="h-5 rounded-lg" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((a: any, idx: number) => (
                <tr key={a.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors duration-200 group" style={{ animationDelay: `${idx * 30}ms` }}>
                  <td className="font-body text-xs p-4 font-bold text-primary">{a.application_number || "—"}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      {photoUrls[a.id]
                        ? <img src={photoUrls[a.id]} alt="" className="w-9 h-9 rounded-xl object-cover border border-border shadow-sm" />
                        : <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{a.full_name[0]}</div>
                      }
                      <div>
                        <span className="font-body text-sm font-semibold text-foreground block">{a.full_name}</span>
                        <span className="font-body text-[10px] text-muted-foreground">{a.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="font-body text-sm p-4 text-foreground">{a.course}</td>
                  <td className="font-body text-sm p-4">
                    <a href={`tel:${a.phone}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {a.phone}
                    </a>
                  </td>
                  <td className="font-body text-xs p-4 text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy")}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-body font-bold capitalize ${statusColor(a.status)}`}>{a.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(a)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      {a.status === "pending" && (
                        <>
                          <button onClick={() => handleStatusChange(a, "approved")} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleStatusChange(a, "rejected")} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center font-body text-sm text-muted-foreground p-12">No applications found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Application Details</h3>
                <p className="font-body text-xs text-primary font-bold">{selected.application_number}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo */}
            {selectedPhotoUrl && (
              <div className="text-center pt-6 px-6">
                <img src={selectedPhotoUrl} alt={selected.full_name} className="w-24 h-24 rounded-2xl object-cover mx-auto border-2 border-border shadow-lg" />
              </div>
            )}

            <div className="p-6 space-y-1.5">
              {[
                ["Name", selected.full_name], ["Email", selected.email], ["Phone", selected.phone],
                ["DOB", selected.date_of_birth], ["Gender", selected.gender], ["Course", selected.course],
                ["Father", selected.father_name], ["Mother", selected.mother_name], ["Address", selected.address],
                ["Previous PU College", selected.previous_school], ["12th %", selected.percentage_12th],
                ["Status", selected.status], ["Applied", format(new Date(selected.created_at), "PPp")],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                  <span className="text-muted-foreground w-32 shrink-0 font-body font-bold text-[10px] uppercase tracking-wider pt-0.5">{k}</span>
                  <span className="text-foreground font-body text-sm font-medium">{v}</span>
                </div>
              ) : null)}
            </div>

            <div className="p-5 pt-0 flex flex-wrap gap-2 border-t border-border">
              <a href={`tel:${selected.phone}`}>
                <Button size="sm" variant="outline" className="rounded-xl font-body text-xs">
                  <Phone className="w-3 h-3 mr-1" /> Call
                </Button>
              </a>
              <a href={`mailto:${selected.email}`}>
                <Button size="sm" variant="outline" className="rounded-xl font-body text-xs">
                  <Mail className="w-3 h-3 mr-1" /> Email
                </Button>
              </a>
              {selected.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => handleStatusChange(selected, "approved")} disabled={updateStatus.isPending} className="rounded-xl font-body text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve & Notify
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selected, "rejected")} disabled={updateStatus.isPending} className="rounded-xl font-body text-xs">
                    <XCircle className="w-3 h-3 mr-1" /> Reject & Notify
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => setSelected(null)} className="rounded-xl font-body text-xs ml-auto">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
