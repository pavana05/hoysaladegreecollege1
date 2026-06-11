import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Clock, XCircle, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppRole = "student" | "teacher" | "principal" | "admin";

interface Props {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

type ApprovalState = { status: "approved" | "pending" | "rejected"; rejection_reason?: string | null } | null;

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, role, loading, signOut } = useAuth();
  const [approval, setApproval] = useState<ApprovalState>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || role !== "student") { setChecking(false); return; }
      const { data } = await supabase
        .from("students")
        .select("approval_status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setApproval(data ? { status: data.approval_status as any, rejection_reason: data.rejection_reason } : { status: "approved" });
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, role]);

  if (loading || checking || (user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;

  // Student approval gate
  if (role === "student" && approval && approval.status !== "approved") {
    const isPending = approval.status === "pending";
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse at top, hsl(45 40% 12%) 0%, hsl(222 47% 6%) 50%, hsl(222 50% 3%) 100%)" }}>
        <div className="max-w-md w-full text-center rounded-3xl border border-white/5 p-8 sm:p-10"
          style={{ background: "linear-gradient(135deg, hsl(222 30% 12% / 0.7), hsl(222 30% 8% / 0.7))", backdropFilter: "blur(24px)" }}>
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isPending ? "bg-amber-500/15 border border-amber-400/30" : "bg-rose-500/15 border border-rose-400/30"}`}>
            {isPending ? <Clock className="w-9 h-9 text-amber-300" /> : <XCircle className="w-9 h-9 text-rose-300" />}
          </div>
          <p className="font-body text-xs uppercase tracking-[0.3em] font-semibold mb-2"
            style={{ color: isPending ? "hsl(45 90% 65%)" : "hsl(0 80% 70%)" }}>
            {isPending ? "Awaiting Approval" : "Registration Rejected"}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
            {isPending ? "Your account is under review" : "Access denied"}
          </h1>
          <p className="font-body text-sm text-white/60 leading-relaxed mb-6">
            {isPending
              ? "An administrator will review your registration shortly. You'll receive an email notification once your account is approved."
              : (approval.rejection_reason || "Your registration could not be approved. Please contact the college office for assistance.")}
          </p>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 mb-6 flex items-center gap-2.5 text-left">
            <Mail className="w-4 h-4 text-white/40 shrink-0" />
            <p className="font-body text-xs text-white/50">For urgent queries, contact <span className="text-amber-300/80">principal@hoysaladegreecollege.in</span></p>
          </div>
          <Button onClick={() => signOut()} variant="outline" className="w-full rounded-xl">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
