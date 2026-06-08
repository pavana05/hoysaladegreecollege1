import { useState } from "react";
import { IOSSelect } from "@/components/ui/ios-select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, ShieldCheck, GraduationCap, Crown, Users, Eye, EyeOff } from "lucide-react";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/password-validation";
import { Link, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/BackButton";

type StaffRole = "teacher" | "principal" | "admin";

const roleConfig: Record<StaffRole, { label: string; icon: any; color: string; bgColor: string; description: string }> = {
  teacher: { label: "Teacher", icon: GraduationCap, color: "text-blue-600", bgColor: "bg-blue-500/10 border-blue-500/20", description: "Can manage attendance, marks, materials & announcements" },
  principal: { label: "Principal", icon: Crown, color: "text-amber-600", bgColor: "bg-amber-500/10 border-amber-500/20", description: "Full CMS authority over faculty, courses, events & notices" },
  admin: { label: "Admin", icon: ShieldCheck, color: "text-red-600", bgColor: "bg-red-500/10 border-red-500/20", description: "Super admin with complete system control (restricted)" },
};

export default function AdminAddStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isApproved = searchParams.get("approved") === "true";
  const [selectedRole, setSelectedRole] = useState<StaffRole>(isApproved ? "admin" : "teacher");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: searchParams.get("name") || "",
    email: searchParams.get("email") || "",
    password: "",
    phone: searchParams.get("phone") || "",
    department_id: "", employee_id: "", qualification: "", experience: "",
    subjects: "",
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: existingStaff = [], isLoading } = useQuery({
    queryKey: ["existing-staff"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: profiles } = await supabase.from("profiles").select("*");
      if (!roles || !profiles) return [];
      return profiles
        .map((p) => {
          const roleEntry = roles.find((r) => r.user_id === p.user_id);
          return { ...p, role: roleEntry?.role || "student" };
        })
        .filter((u) => u.role !== "student");
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name || !form.email) throw new Error("Name and email are required");

      // For admin role without approval, submit a pending request
      if (selectedRole === "admin" && !isApproved) {
        const { error } = await supabase.from("pending_admin_requests").insert({
          requester_id: user?.id,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || "",
          status: "pending",
        });
        if (error) throw error;
        return "admin_pending";
      }

      // For approved admin or teacher/principal, create the account via edge function
      const pwCheck = validatePassword(form.password);
      if (!pwCheck.valid) throw new Error(pwCheck.message);

      if (selectedRole === "admin" && isApproved) {
        // Admin creation still uses signUp since handle_new_user handles it
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.full_name, role: "admin" },
            emailRedirectTo: window.location.origin,
          },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user");
        await new Promise((r) => setTimeout(r, 2500));
        if (form.phone) {
          await supabase.from("profiles").update({ phone: form.phone }).eq("user_id", authData.user.id);
        }
      } else {
        // Teacher/Principal creation via edge function (preserves admin session)
        const { data, error } = await supabase.functions.invoke("create-staff", {
          body: {
            role: selectedRole,
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            phone: form.phone,
            employee_id: form.employee_id || undefined,
            department_id: form.department_id || undefined,
            qualification: form.qualification || undefined,
            experience: form.experience || undefined,
            subjects: form.subjects || undefined,
          },
        });
        if (error) throw new Error(error.message || "Failed to create staff");
        if (data?.error) throw new Error(data.error);
      }
      return "created";
    },
    onSuccess: (result) => {
      if (result === "admin_pending") {
        toast.success("Admin request submitted! Go to Admin Approval Queue to accept the request.");
      } else {
        toast.success(`${roleConfig[selectedRole].label} account created! Email confirmation sent.`);
      }
      setForm({ full_name: "", email: "", password: "", phone: "", department_id: "", employee_id: "", qualification: "", experience: "", subjects: "" });
      queryClient.invalidateQueries({ queryKey: ["existing-staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-admin-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  // Show password field for all roles when creating account (approved admin or teacher/principal)
  const showPasswordField = selectedRole !== "admin" || isApproved;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BackButton />
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5 mb-1">
              <span className="font-body text-[10px] text-primary font-semibold uppercase tracking-wider">Staff Management</span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {isApproved ? "Create Approved Admin Account" : "Add Staff / Users"}
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              {isApproved ? "Set a password to complete the admin account creation" : "Create teacher, principal, or admin accounts"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Left: Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Role Selection - hide when coming from approval */}
          {!isApproved && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display text-sm font-bold text-foreground mb-3">Select Role</h3>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(roleConfig) as StaffRole[]).map((role) => {
                  const cfg = roleConfig[role];
                  const Icon = cfg.icon;
                  const isSelected = selectedRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-center ${
                        isSelected
                          ? `${cfg.bgColor} ring-2 ring-offset-2 ring-primary/30 scale-[1.02]`
                          : "border-border hover:border-primary/20 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? cfg.color : "text-muted-foreground"}`} />
                      <p className={`font-display text-sm font-bold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{cfg.label}</p>
                      <p className="font-body text-[10px] text-muted-foreground mt-1 leading-tight">{cfg.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approved admin notice */}
          {isApproved && (
            <div className="bg-green-500/5 border-2 border-green-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <h4 className="font-display text-sm font-bold text-green-700">Admin Request Approved</h4>
              </div>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                This admin request has been approved. Please set a password below to complete the account creation.
              </p>
            </div>
          )}

          {/* Admin pending request notice (when not approved) */}
          {selectedRole === "admin" && !isApproved && (
            <div className="bg-red-500/5 border-2 border-red-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-600" />
                <h4 className="font-display text-sm font-bold text-red-700">Admin Creation Requires Approval</h4>
              </div>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                Submitting this form will create a <strong>pending request</strong>. Go to the Admin Approval Queue to accept or decline it. 
                Once accepted, you'll be redirected here to set a password and complete the account.
              </p>
              <Link to="/dashboard/admin/approve-admins" className="inline-flex items-center gap-2 font-body text-xs text-primary hover:underline font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Go to Admin Approval Queue →
              </Link>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); addStaffMutation.mutate(); }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">1</span>
              <h4 className="font-body text-xs font-bold text-primary uppercase tracking-wider">
                {selectedRole === "admin" && !isApproved ? "Admin Request Information" : "Account Information"}
              </h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Full Name *</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className={inputClass} placeholder="Enter full name" />
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputClass} placeholder="name@example.com" />
              </div>
              {showPasswordField && (
                <div>
                  <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Password *</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className={inputClass} placeholder={PASSWORD_REQUIREMENTS} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="Phone number" />
              </div>
            </div>

            {/* Teacher-specific fields */}
            {selectedRole === "teacher" && (
              <>
                <div className="flex items-center gap-2 pt-3 pb-3 border-b border-border">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">2</span>
                  <h4 className="font-body text-xs font-bold text-primary uppercase tracking-wider">Teacher Details</h4>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Department</label>
                    <IOSSelect value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className={inputClass}>
                      <option value="">Select Department</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                    </IOSSelect>
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Employee ID</label>
                    <input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className={inputClass} placeholder="Auto-generated if empty" />
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Qualification</label>
                    <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className={inputClass} placeholder="e.g. M.Sc, M.Tech" />
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Experience</label>
                    <input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className={inputClass} placeholder="e.g. 5 Years" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Subjects (comma-separated)</label>
                    <input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} className={inputClass} placeholder="e.g. Mathematics, Physics, Statistics" />
                  </div>
                </div>
              </>
            )}

            <div className="pt-3">
              <Button type="submit" disabled={addStaffMutation.isPending} className="w-full rounded-xl font-body py-3">
                {addStaffMutation.isPending ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {selectedRole === "admin" && !isApproved ? "Submitting Request..." : "Creating Account..."}</span>
                ) : (
                  <span className="flex items-center gap-2">
                    {selectedRole === "admin" ? <ShieldCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {selectedRole === "admin" && !isApproved ? "Submit Admin Request for Approval" : `Create ${roleConfig[selectedRole].label} Account`}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right: Existing Staff List */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">Existing Staff</h3>
              <span className="ml-auto font-body text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{existingStaff.length}</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : existingStaff.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground text-center py-8">No staff members yet</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {existingStaff.map((staff: any) => {
                  const cfg = roleConfig[staff.role as StaffRole] || roleConfig.teacher;
                  const Icon = cfg.icon;
                  return (
                    <div key={staff.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm font-semibold text-foreground truncate">{staff.full_name || "Unnamed"}</p>
                        <p className="font-body text-[10px] text-muted-foreground truncate">{staff.email}</p>
                      </div>
                      <span className={`font-body text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color} capitalize`}>{staff.role}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
