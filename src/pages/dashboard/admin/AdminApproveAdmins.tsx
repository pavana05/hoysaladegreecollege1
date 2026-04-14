import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

export default function AdminApproveAdmins() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [showReject, setShowReject] = useState<Record<string, boolean>>({});

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pending-admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_admin_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("pending_admin_requests")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: (_, requestId) => {
      toast.success("Admin request approved! Redirecting to create the account...");
      queryClient.invalidateQueries({ queryKey: ["pending-admin-requests"] });
      const req = requests.find((r: any) => r.id === requestId);
      if (req) {
        const params = new URLSearchParams({ name: req.full_name, email: req.email, phone: req.phone || "" });
        window.location.href = `/dashboard/admin/add-staff?approved=true&${params.toString()}`;
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from("pending_admin_requests")
        .update({
          status: "rejected",
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason || "No reason provided",
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request rejected.");
      queryClient.invalidateQueries({ queryKey: ["pending-admin-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("pending_admin_requests")
        .delete()
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request deleted.");
      queryClient.invalidateQueries({ queryKey: ["pending-admin-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = requests.filter((r: any) => r.status === "pending");
  const approved = requests.filter((r: any) => r.status === "approved");
  const rejected = requests.filter((r: any) => r.status === "rejected");

  const statusIcon = (status: string) => {
    if (status === "pending") return <Clock className="w-4 h-4 text-amber-500" />;
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-500/10 via-card to-amber-500/10 border border-border rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-0.5 mb-1">
              <span className="font-body text-[10px] text-red-600 font-semibold uppercase tracking-wider">Security</span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Admin Approval Queue</h2>
            <p className="font-body text-xs text-muted-foreground">Review & approve or decline new admin account requests</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-display text-lg font-bold text-foreground">No Admin Requests</p>
          <p className="font-body text-sm text-muted-foreground mt-1">All admin requests will appear here for approval</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-bold text-amber-600 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Pending Approval ({pending.length})
              </h3>
              <div className="space-y-3">
                {pending.map((req: any) => (
                  <div key={req.id} className="bg-card border-2 border-amber-500/20 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-base font-bold text-foreground">{req.full_name}</p>
                        <p className="font-body text-sm text-muted-foreground">{req.email}</p>
                        {req.phone && <p className="font-body text-xs text-muted-foreground">{req.phone}</p>}
                        <p className="font-body text-[10px] text-muted-foreground mt-1">
                          Requested: {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {statusIcon("pending")}
                    </div>

                    {/* Accept / Decline buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => {
                          if (confirm(`Approve "${req.full_name}" as Admin?`)) approveMutation.mutate(req.id);
                        }}
                        disabled={approveMutation.isPending}
                        className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {approveMutation.isPending ? "Approving..." : "Accept"}
                      </Button>

                      {!showReject[req.id] ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowReject({ ...showReject, [req.id]: true })}
                          className="rounded-xl gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10"
                        >
                          <XCircle className="w-4 h-4" /> Decline
                        </Button>
                      ) : (
                        <div className="flex gap-2 items-end flex-1">
                          <div className="flex-1">
                            <input
                              value={rejectReasons[req.id] || ""}
                              onChange={(e) => setRejectReasons({ ...rejectReasons, [req.id]: e.target.value })}
                              className={inputClass}
                              placeholder="Reason for declining (optional)"
                            />
                          </div>
                          <Button
                            onClick={() => rejectMutation.mutate({ requestId: req.id, reason: rejectReasons[req.id] || "" })}
                            disabled={rejectMutation.isPending}
                            variant="destructive"
                            size="sm"
                            className="rounded-xl"
                          >
                            Confirm Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-bold text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Approved ({approved.length})
              </h3>
              <div className="space-y-2">
                {approved.map((req: any) => (
                  <div key={req.id} className="bg-card border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-display text-sm font-semibold text-foreground">{req.full_name}</p>
                      <p className="font-body text-xs text-muted-foreground">{req.email}</p>
                      <p className="font-body text-[10px] text-green-600 mt-0.5">
                        Approved: {req.approved_at ? new Date(req.approved_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon("approved")}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(req.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Declined ({rejected.length})
              </h3>
              <div className="space-y-2">
                {rejected.map((req: any) => (
                  <div key={req.id} className="bg-card border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-display text-sm font-semibold text-foreground">{req.full_name}</p>
                      <p className="font-body text-xs text-muted-foreground">{req.email}</p>
                      {req.rejection_reason && (
                        <p className="font-body text-[10px] text-red-500 mt-0.5">Reason: {req.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon("rejected")}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(req.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
