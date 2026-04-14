import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import BackButton from "@/components/BackButton";

export default function AdminRoles() {
  const { data: roleCounts = [] } = useQuery({
    queryKey: ["admin-role-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((r) => { counts[r.role] = (counts[r.role] || 0) + 1; });
      return Object.entries(counts).map(([role, count]) => ({ role, count }));
    },
  });

  const roleDescriptions: Record<string, string> = {
    student: "Can view their own attendance, marks, notices, and study materials.",
    teacher: "Can manage students, mark attendance, upload marks and materials, post notices.",
    principal: "Full CMS authority: manage events, courses, departments, top students, notices.",
    admin: "Super admin: manage all users, roles, and system settings.",
  };

  const roleIcons: Record<string, string> = {
    student: "bg-blue-500/10",
    teacher: "bg-emerald-500/10",
    principal: "bg-amber-500/10",
    admin: "bg-red-500/10",
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] bg-primary/[0.08]" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Roles & Permissions</h2>
            <p className="font-body text-sm text-muted-foreground">Overview of user roles and their capabilities</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {["student", "teacher", "principal", "admin"].map((role, i) => {
          const count = roleCounts.find((r) => r.role === role)?.count || 0;
          return (
            <div key={role}
              className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${i * 80}ms`, opacity: 0, animationFillMode: 'forwards' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-secondary/[0.02]" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${roleIcons[role]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground capitalize">{role}</h3>
                    <p className="font-body text-xs text-muted-foreground">{count} user{count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{roleDescriptions[role]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
