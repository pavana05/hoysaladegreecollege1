import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/BackButton";
import {
  UserCheck, Search, CheckCircle, XCircle, X, Phone, Mail, MapPin,
  Calendar, Shield, Sparkles, Eye, IdCard, GraduationCap, Users,
  ShieldAlert, Zap, Hand, Clock, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatAadhaar } from "@/lib/format-aadhaar";

type Student = any;

const SETTING_KEY = "student_auto_approve";

export default function AdminStudentApprovals() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selected, setSelected] = useState<Student | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // --- Auto-approve toggle ---
  const { data: setting } = useQuery({
    queryKey: ["app-setting", SETTING_KEY],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
      return data?.value as { enabled?: boolean } | null;
    },
  });
  const autoApprove = !!setting?.enabled;

  const toggleAuto = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTING_KEY, value: { enabled }, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["app-setting", SETTING_KEY] });
      toast.success(v ? "Auto-approval enabled — new registrations are instant" : "Manual approval mode — new students need your review");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Students list ---
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["student-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id, user_id, uucms_id, roll_number, approval_status, rejection_reason,
          approved_at, rejected_at, created_at, phone, address, date_of_birth,
          gender, blood_group, nationality, avatar_url, father_name, mother_name,
          parent_phone, emergency_contact_name, emergency_contact_phone,
          emergency_contact_relation, previous_school, fee_remarks, course_id,
          profiles:user_id ( full_name, email, phone ),
          course:course_id ( name, code ),
          sensitive:student_sensitive_data ( aadhaar_number, category )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Resolve signed URLs for avatars stored in 'uploads' bucket (already public, just use url; admission-photos would need signing)
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const s of students as any[]) {
      if (s.avatar_url) urls[s.id] = s.avatar_url;
    }
    setPhotoUrls(urls);
  }, [students]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: students.length };
    for (const s of students as any[]) {
      if (s.approval_status === "pending") c.pending++;
      else if (s.approval_status === "approved") c.approved++;
      else if (s.approval_status === "rejected") c.rejected++;
    }
    return c;
  }, [students]);

  const filtered = useMemo(() => {
    return (students as any[]).filter((s) => {
      if (tab !== "all" && s.approval_status !== tab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.profiles?.full_name?.toLowerCase().includes(q) ||
        s.profiles?.email?.toLowerCase().includes(q) ||
        s.uucms_id?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
      );
    });
  }, [students, tab, search]);

  const approveOne = useMutation({
    mutationFn: async (s: Student) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("students")
        .update({
          approval_status: "approved",
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id || null,
          rejection_reason: null,
          rejected_at: null,
        })
        .eq("id", s.id);
      if (error) throw error;
      // Notify the student
      await supabase.from("notifications").insert({
        user_id: s.user_id,
        title: "🎉 Registration Approved",
        message: "Welcome to HDC Portal! Your student account has been approved by the administration. Sign in again to access your dashboard.",
        type: "approval",
        link: "/dashboard/student",
      });

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-approvals"] });
      toast.success("Student approved");
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectOne = useMutation({
    mutationFn: async ({ s, reason }: { s: Student; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("students")
        .update({
          approval_status: "rejected",
          is_active: false,
          rejected_at: new Date().toISOString(),
          approved_by: user?.id || null,
          rejection_reason: reason,
        })
        .eq("id", s.id);
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: s.user_id,
        title: "❌ Registration Not Approved",
        message: reason?.trim()
          ? `Your registration was not approved. Reason: ${reason.trim()}. Please contact the college office for assistance.`
          : "Your registration was not approved. Please contact the college office for assistance.",
        type: "approval_rejected",
        link: "/login",
      });

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-approvals"] });
      toast.success("Student rejected");
      setRejectingId(null);
      setRejectReason("");
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkApprove = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const pending = (students as any[]).filter((s) => s.approval_status === "pending");
      if (!pending.length) throw new Error("Nothing pending");
      const { error } = await supabase
        .from("students")
        .update({
          approval_status: "approved",
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id || null,
        })
        .in("id", pending.map((p) => p.id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-approvals"] });
      toast.success("All pending students approved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusChip = (s: string) =>
    s === "approved" ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
    : s === "rejected" ? "text-destructive bg-destructive/8 border border-destructive/20"
    : "text-amber-700 bg-amber-50 border border-amber-200";

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/8 via-card to-secondary/8 border border-border rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Student Approvals
            </h2>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              {counts.pending} awaiting review · {counts.approved} approved · {counts.rejected} rejected
            </p>
          </div>
        </div>
      </div>

      {/* Auto-approve toggle card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${autoApprove ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
            {autoApprove ? <Zap className="w-6 h-6 text-emerald-600" /> : <Hand className="w-6 h-6 text-amber-600" />}
          </div>
          <div className="flex-1 min-w-[180px]">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              {autoApprove ? "Automatic Approval" : "Manual Approval"}
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </h3>
            <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">
              {autoApprove
                ? "New student registrations are approved instantly and can sign in immediately."
                : "New student registrations stay in the pending queue until you approve them here."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              {autoApprove ? "Auto" : "Manual"}
            </span>
            <Switch
              checked={autoApprove}
              onCheckedChange={(v) => toggleAuto.mutate(v)}
              disabled={toggleAuto.isPending}
              aria-label="Toggle auto-approve"
            />
          </div>
        </div>
        {counts.pending > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
            <p className="font-body text-xs text-muted-foreground">
              <Clock className="inline w-3 h-3 mr-1" /> {counts.pending} registration{counts.pending !== 1 ? "s" : ""} waiting
            </p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => bulkApprove.mutate()}
              disabled={bulkApprove.isPending}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve all pending
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ["pending", "Pending", counts.pending, "amber"],
          ["approved", "Approved", counts.approved, "emerald"],
          ["rejected", "Rejected", counts.rejected, "rose"],
          ["all", "All", counts.all, "muted"],
        ] as const).map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-4 py-2 rounded-xl font-body text-xs font-bold transition-all ${tab === k
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
          >
            {label} <span className="ml-1 opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, UUCMS, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-body text-sm text-muted-foreground">
              {tab === "pending" ? "Inbox zero — no students awaiting review." : "No students in this view."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {filtered.map((s: any) => (
              <li key={s.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center gap-3 sm:gap-4 flex-wrap">
                {photoUrls[s.id]
                  ? <img src={photoUrls[s.id]} alt="" className="w-12 h-12 rounded-2xl object-cover border border-border shadow-sm shrink-0" />
                  : <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">{(s.profiles?.full_name || "?")[0]}</div>
                }
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-sm font-semibold text-foreground">{s.profiles?.full_name || "—"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-bold capitalize ${statusChip(s.approval_status)}`}>{s.approval_status}</span>
                  </div>
                  <div className="font-body text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                    <span><IdCard className="inline w-3 h-3 mr-0.5" />{s.uucms_id || "no UUCMS"}</span>
                    <span>·</span>
                    <span>{s.profiles?.email}</span>
                    {s.course?.code && (<><span>·</span><span>{s.course.code}</span></>)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelected(s)}
                    className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {s.approval_status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approveOne.mutate(s)}
                        disabled={approveOne.isPending}
                        className="rounded-xl text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { setRejectingId(s.id); setRejectReason(""); }}
                        className="rounded-xl text-xs h-8 px-3"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                {photoUrls[selected.id]
                  ? <img src={photoUrls[selected.id]} alt="" className="w-12 h-12 rounded-2xl object-cover border border-border" />
                  : <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">{(selected.profiles?.full_name || "?")[0]}</div>}
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">{selected.profiles?.full_name}</h3>
                  <p className="font-body text-[11px] text-muted-foreground">{selected.profiles?.email}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <Section title="Identity" icon={IdCard}>
                <Row label="UUCMS ID" value={selected.uucms_id} highlight />
                <Row label="Aadhaar" value={formatAadhaar(selected.sensitive?.[0]?.aadhaar_number)} />
                <Row label="Date of Birth" value={selected.date_of_birth} />
                <Row label="Gender" value={selected.gender} />
                <Row label="Blood Group" value={selected.blood_group} />
                <Row label="Nationality" value={selected.nationality} />
                <Row label="Category" value={selected.sensitive?.[0]?.category} />
              </Section>

              <Section title="Academic" icon={GraduationCap}>
                <Row label="Course" value={selected.course ? `${selected.course.name} (${selected.course.code})` : "—"} />
                <Row label="Previous School" value={selected.previous_school} />
                <Row label="Prior Qualification" value={selected.fee_remarks} />
              </Section>

              <Section title="Contact" icon={Phone}>
                <Row label="Mobile" value={selected.phone} />
                <Row label="Address" value={selected.address} />
              </Section>

              <Section title="Family" icon={Users}>
                <Row label="Father" value={selected.father_name} />
                <Row label="Mother" value={selected.mother_name} />
                <Row label="Parent Phone" value={selected.parent_phone} />
              </Section>

              <Section title="Emergency Contact" icon={ShieldAlert}>
                <Row label="Name" value={selected.emergency_contact_name} />
                <Row label="Relation" value={selected.emergency_contact_relation} />
                <Row label="Phone" value={selected.emergency_contact_phone} />
              </Section>

              <Section title="Submitted" icon={Calendar}>
                <Row label="Registered" value={selected.created_at ? format(new Date(selected.created_at), "PPp") : "—"} />
                {selected.approved_at && <Row label="Approved" value={format(new Date(selected.approved_at), "PPp")} />}
                {selected.rejected_at && <Row label="Rejected" value={format(new Date(selected.rejected_at), "PPp")} />}
                {selected.rejection_reason && <Row label="Reason" value={selected.rejection_reason} />}
              </Section>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-2 flex-wrap rounded-b-2xl">
              <a href={`tel:${selected.phone}`}><Button size="sm" variant="outline" className="rounded-xl text-xs"><Phone className="w-3.5 h-3.5 mr-1" /> Call</Button></a>
              <a href={`mailto:${selected.profiles?.email}`}><Button size="sm" variant="outline" className="rounded-xl text-xs"><Mail className="w-3.5 h-3.5 mr-1" /> Email</Button></a>
              {selected.approval_status === "pending" && (
                <>
                  <Button size="sm" className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                    onClick={() => approveOne.mutate(selected)} disabled={approveOne.isPending}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-xl text-xs"
                    onClick={() => { setRejectingId(selected.id); setRejectReason(""); }}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">Reject Registration</h3>
            </div>
            <p className="font-body text-xs text-muted-foreground mb-3">
              Please share a brief reason — the student will see this message and can re-register if appropriate.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. UUCMS ID does not match our records"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 resize-none"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-xl text-xs"
                onClick={() => {
                  const s = (students as any[]).find((x) => x.id === rejectingId);
                  if (s) rejectOne.mutate({ s, reason: rejectReason.trim() });
                }}
                disabled={rejectOne.isPending}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
      <p className="font-body text-[10px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1.5 mb-2">
        <Icon className="w-3 h-3" /> {title}
      </p>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className={`font-body text-xs text-right break-words ${highlight ? "text-primary font-bold" : "text-foreground"}`}>
        {value && value.toString().trim() ? value : <span className="text-muted-foreground/40 italic">—</span>}
      </span>
    </div>
  );
}
