import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { formatAadhaar } from "@/lib/format-aadhaar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Trash2, Edit3, X, Save, Users, Phone, UserPlus, Eye, ArrowLeft, KeyRound, GraduationCap, BookOpen, Shield } from "lucide-react";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/password-validation";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminAddStaff from "./AdminAddStaff";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/BackButton";

/* ── Students Directory Sub-Component ── */
function StudentsDirectory({ users, courses, isLoading, navigate }: { users: any[]; courses: any[]; isLoading: boolean; navigate: any }) {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "roll" | "semester" | "recent">("name");

  const students = useMemo(() => {
    return users.filter((u: any) => u.role === "student" && u.student);
  }, [users]);

  const filtered = useMemo(() => {
    let list = students.filter((u: any) => {
      const name = (u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const roll = (u.student?.roll_number || "").toLowerCase();
      const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase()) || roll.includes(search.toLowerCase());
      const matchCourse = courseFilter === "All" || u.student?.course_id === courseFilter;
      const matchSemester = semesterFilter === "All" || u.student?.semester === parseInt(semesterFilter);
      const matchGender = genderFilter === "All" || (u.student?.gender || "").toLowerCase() === genderFilter.toLowerCase();
      return matchSearch && matchCourse && matchSemester && matchGender;
    });
    list.sort((a: any, b: any) => {
      if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "");
      if (sortBy === "roll") return (a.student?.roll_number || "").localeCompare(b.student?.roll_number || "");
      if (sortBy === "semester") return (a.student?.semester || 0) - (b.student?.semester || 0);
      if (sortBy === "recent") return new Date(b.student?.created_at || 0).getTime() - new Date(a.student?.created_at || 0).getTime();
      return 0;
    });
    return list;
  }, [students, search, courseFilter, semesterFilter, genderFilter, sortBy]);

  const courseStats = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((u: any) => {
      const cName = u.student?.courses?.code || "Unassigned";
      map[cName] = (map[cName] || 0) + 1;
    });
    return map;
  }, [students]);

  const selectClass = "border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-4">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Total Students</p>
          <p className="font-display text-2xl font-bold text-foreground mt-1">{students.length}</p>
        </div>
        {Object.entries(courseStats).slice(0, 3).map(([code, count]) => (
          <div key={code} className="relative overflow-hidden bg-card border border-border rounded-2xl p-4">
            <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">{code}</p>
            <p className="font-display text-2xl font-bold text-foreground mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or roll number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl text-sm" />
          </div>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={selectClass}>
            <option value="All">All Courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className={selectClass}>
            <option value="All">All Semesters</option>
            {[1,2,3,4,5,6].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
          </select>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className={selectClass}>
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className={selectClass}>
            <option value="name">Sort: Name</option>
            <option value="roll">Sort: Roll No</option>
            <option value="semester">Sort: Semester</option>
            <option value="recent">Sort: Recent</option>
          </select>
        </div>
        <p className="font-body text-[10px] text-muted-foreground">{filtered.length} student{filtered.length !== 1 ? "s" : ""} found</p>
      </div>

      {/* Student Cards Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u: any, idx: number) => {
            const feeStatus = (u.student?.total_fee || 0) > 0
              ? ((u.student?.fee_paid || 0) >= (u.student?.total_fee || 0) ? "paid" : "pending")
              : "na";
            return (
              <div
                key={u.id}
                onClick={() => navigate(`/dashboard/admin/users/${u.user_id}`)}
                className="relative overflow-hidden bg-card border border-border rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              >
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Header: Avatar + Name */}
                <div className="relative flex items-start gap-3.5">
                  {u.student?.avatar_url ? (
                    <img src={u.student.avatar_url} alt={u.full_name} className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/15 shrink-0 group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 border border-primary/10">
                      <span className="font-display text-lg font-bold text-primary">{(u.full_name || "?")[0].toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-body text-sm font-bold text-foreground truncate">{u.full_name || "—"}</h4>
                    <p className="font-body text-[11px] text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {u.student?.courses?.code && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body font-semibold">{u.student.courses.code}</span>
                      )}
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body">Sem {u.student?.semester || "?"}</span>
                      {feeStatus === "paid" && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-body font-semibold">Fee Paid</span>}
                      {feeStatus === "pending" && <span className="text-[9px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-body font-semibold">Fee Due</span>}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 rounded-xl px-3 py-2">
                    <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Roll No</p>
                    <p className="font-body text-xs font-semibold text-foreground">{u.student?.roll_number || "—"}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl px-3 py-2">
                    <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Year</p>
                    <p className="font-body text-xs font-semibold text-foreground">{u.student?.year_level ? `${u.student.year_level}${["st","nd","rd"][u.student.year_level-1]||"th"} Year` : "—"}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl px-3 py-2">
                    <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Phone</p>
                    <p className="font-body text-xs font-semibold text-foreground truncate">{u.phone || u.student?.phone || "—"}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl px-3 py-2">
                    <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Gender</p>
                    <p className="font-body text-xs font-semibold text-foreground">{u.student?.gender || "—"}</p>
                  </div>
                </div>

                {/* Footer: Quick actions */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-body text-[9px] text-muted-foreground">
                    {u.student?.admission_year ? `Admitted ${u.student.admission_year}` : ""}
                  </p>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-body text-[9px] text-muted-foreground group-hover:text-primary transition-colors">View Details</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-sm text-muted-foreground">No students found matching your filters.</p>
        </div>
      )}
    </div>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", roll_number: "", semester: "", parent_phone: "", address: "", date_of_birth: "", course_id: "", total_fee: "", fee_paid: "", fee_due_date: "", fee_remarks: "", employee_id: "", department_id: "", qualification: "", experience: "", subjects: "", aadhaar_number: "", nationality: "", religion: "", caste: "", category: "", blood_group: "", gender: "" });
  const [editingRole, setEditingRole] = useState<string>("student");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [viewUser, setViewUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [resetPwUser, setResetPwUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newStudent, setNewStudent] = useState({
    full_name: "", email: "", password: "", phone: "", date_of_birth: "",
    roll_number: "", course_id: "", year_level: "1", semester: "1",
    academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    admission_year: new Date().getFullYear().toString(),
    father_name: "", mother_name: "", parent_phone: "", address: "",
    aadhaar_number: "", nationality: "Indian", religion: "", caste: "",
    category: "", blood_group: "", gender: "",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: roles }, { data: profiles }, { data: students }, { data: teachers }, { data: sensitive }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role, id"),
        supabase.from("profiles").select("user_id, full_name, email, phone, avatar_url"),
        supabase.from("students").select("*, courses(name, code)"),
        supabase.from("teachers").select("*, departments:department_id(name, code)"),
        supabase.from("student_sensitive_data").select("student_id, aadhaar_number, caste, religion, category"),
      ]);
      if (!roles || !profiles) return [];
      const roleMap = new Map(roles.map(r => [r.user_id, r]));
      const sensitiveMap = new Map((sensitive || []).map((s: any) => [s.student_id, s]));
      const studentMap = new Map((students || []).map((s: any) => {
        const sens = sensitiveMap.get(s.id) || {};
        return [s.user_id, { ...s, aadhaar_number: (sens as any).aadhaar_number, caste: (sens as any).caste, religion: (sens as any).religion, category: (sens as any).category }];
      }));
      const teacherMap = new Map((teachers || []).map((t: any) => [t.user_id, t]));
      return profiles.map((p) => {
        const roleEntry = roleMap.get(p.user_id);
        const studentEntry = studentMap.get(p.user_id);
        const teacherEntry = teacherMap.get(p.user_id);
        return { ...p, role: roleEntry?.role || "student", role_id: roleEntry?.id, student: studentEntry, teacher: teacherEntry, avatarUrl: (studentEntry as any)?.avatar_url };
      });
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["admin-departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role updated!"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, role, full_name, phone, roll_number, semester, parent_phone, address, date_of_birth, course_id, total_fee, fee_paid, fee_due_date, fee_remarks, employee_id, department_id, qualification, experience, subjects, aadhaar_number, nationality, religion, caste, category, blood_group, gender }: any) => {
      const { error } = await supabase.from("profiles").update({ full_name, phone }).eq("user_id", userId);
      if (error) throw error;

      if (role === "student") {
        const studentUpdate: any = {
          phone: phone || "",
          parent_phone: parent_phone || "",
          address: address || "",
          date_of_birth: date_of_birth || null,
          fee_remarks: fee_remarks || "",
        };
        if (roll_number) studentUpdate.roll_number = roll_number;
        if (semester) studentUpdate.semester = parseInt(semester);
        if (course_id) studentUpdate.course_id = course_id;
        if (total_fee !== undefined && total_fee !== "") studentUpdate.total_fee = parseFloat(total_fee) || 0;
        if (fee_paid !== undefined && fee_paid !== "") studentUpdate.fee_paid = parseFloat(fee_paid) || 0;
        if (fee_due_date) studentUpdate.fee_due_date = fee_due_date;
        // Extra fields
        if (aadhaar_number !== undefined) studentUpdate.aadhaar_number = aadhaar_number;
        if (nationality !== undefined) studentUpdate.nationality = nationality;
        if (religion !== undefined) studentUpdate.religion = religion;
        if (caste !== undefined) studentUpdate.caste = caste;
        if (category !== undefined) studentUpdate.category = category;
        if (blood_group !== undefined) studentUpdate.blood_group = blood_group;
        if (gender !== undefined) studentUpdate.gender = gender;
        const { error: studentError } = await supabase.from("students").update(studentUpdate).eq("user_id", userId);
        if (studentError) throw studentError;
      } else if (role === "teacher") {
        const teacherUpdate: any = {};
        if (employee_id) teacherUpdate.employee_id = employee_id;
        if (department_id) teacherUpdate.department_id = department_id;
        if (qualification !== undefined) teacherUpdate.qualification = qualification;
        if (experience !== undefined) teacherUpdate.experience = experience;
        if (subjects !== undefined) teacherUpdate.subjects = subjects.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (Object.keys(teacherUpdate).length > 0) {
          await supabase.from("teachers").update(teacherUpdate).eq("user_id", userId);
        }
      }
    },
    onSuccess: () => { toast.success("Profile updated!"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setEditingId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { userId } });
      if (error) throw new Error(error.message || "Delete failed");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(`Delete failed: ${e.message}`),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("reset-password", { body: { userId, newPassword: password } });
      if (error) throw new Error(error.message || "Reset failed");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => { toast.success("Password reset successfully!"); setResetPwUser(null); setNewPassword(""); },
    onError: (e: any) => toast.error(`Reset failed: ${e.message}`),
  });

  const addStudentMutation = useMutation({
    mutationFn: async () => {
      const pwCheck = validatePassword(newStudent.password);
      if (!pwCheck.valid) throw new Error(pwCheck.message);
      const { data, error } = await supabase.functions.invoke("create-student", {
        body: {
          email: newStudent.email,
          password: newStudent.password,
          full_name: newStudent.full_name,
          phone: newStudent.phone,
          date_of_birth: newStudent.date_of_birth || null,
          roll_number: newStudent.roll_number,
          course_id: newStudent.course_id || null,
          year_level: newStudent.year_level,
          semester: newStudent.semester,
          admission_year: newStudent.admission_year,
          father_name: newStudent.father_name,
          mother_name: newStudent.mother_name,
          parent_phone: newStudent.parent_phone,
          address: newStudent.address,
          aadhaar_number: newStudent.aadhaar_number,
          nationality: newStudent.nationality,
          religion: newStudent.religion,
          caste: newStudent.caste,
          category: newStudent.category,
          blood_group: newStudent.blood_group,
          gender: newStudent.gender,
        },
      });
      if (error) throw new Error(error.message || "Failed to create student");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Student created successfully!");
      setShowAddStudent(false);
      setNewStudent({ full_name: "", email: "", password: "", phone: "", date_of_birth: "", roll_number: "", course_id: "", year_level: "1", semester: "1", academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, admission_year: new Date().getFullYear().toString(), father_name: "", mother_name: "", parent_phone: "", address: "", aadhaar_number: "", nationality: "Indian", religion: "", caste: "", category: "", blood_group: "", gender: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (u: any) => {
    setEditingId(u.user_id);
    setEditingRole(u.role || "student");
    if (u.role === "teacher") {
      setEditForm({
        full_name: u.full_name || "", phone: u.phone || "",
        employee_id: u.teacher?.employee_id || "",
        department_id: u.teacher?.department_id || "",
        qualification: u.teacher?.qualification || "",
        experience: u.teacher?.experience || "",
        subjects: u.teacher?.subjects?.join(", ") || "",
        roll_number: "", semester: "", parent_phone: "", address: "",
        date_of_birth: "", course_id: "", total_fee: "", fee_paid: "",
        fee_due_date: "", fee_remarks: "",
        aadhaar_number: "", nationality: "", religion: "", caste: "",
        category: "", blood_group: "", gender: "",
      });
    } else {
      setEditForm({
        full_name: u.full_name || "", phone: u.phone || "",
        roll_number: u.student?.roll_number || "", semester: String(u.student?.semester || ""),
        parent_phone: u.student?.parent_phone || "", address: u.student?.address || "",
        date_of_birth: u.student?.date_of_birth || "", course_id: u.student?.course_id || "",
        total_fee: String(u.student?.total_fee || ""), fee_paid: String(u.student?.fee_paid || ""),
        fee_due_date: u.student?.fee_due_date || "", fee_remarks: u.student?.fee_remarks || "",
        employee_id: "", department_id: "", qualification: "", experience: "", subjects: "",
        aadhaar_number: (u.student as any)?.aadhaar_number || "",
        nationality: (u.student as any)?.nationality || "",
        religion: (u.student as any)?.religion || "",
        caste: (u.student as any)?.caste || "",
        category: (u.student as any)?.category || "",
        blood_group: (u.student as any)?.blood_group || "",
        gender: (u.student as any)?.gender || "",
      });
    }
  };

  const filtered = users.filter((u: any) => {
    const name = (u.full_name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    let matchCourse = true;
    if (courseFilter === "no-course") matchCourse = u.role === "student" && !u.student?.course_id;
    else if (courseFilter !== "All") matchCourse = u.student?.course_id === courseFilter;
    let matchSemester = true;
    if (semesterFilter !== "All") matchSemester = u.student?.semester === parseInt(semesterFilter);
    return matchSearch && matchRole && matchCourse && matchSemester;
  });

  const roleCounts = users.reduce((acc: Record<string, number>, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const inputClass = "w-full border border-border rounded-xl px-3 py-2.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5 mb-1">
                <span className="font-body text-[10px] text-primary font-semibold uppercase tracking-wider">Admin Panel</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">User Management</h2>
              <p className="font-body text-xs text-muted-foreground">{users.length} registered users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: User Management + Students + Add Staff */}
      <Tabs defaultValue="users" className="space-y-5">
        <TabsList className="w-full justify-start bg-card border border-border rounded-2xl p-1.5 h-auto flex-wrap">
          <TabsTrigger value="users" className="rounded-xl font-body text-xs font-semibold px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-3.5 h-3.5 mr-1.5" /> User Management
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-xl font-body text-xs font-semibold px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Students
          </TabsTrigger>
          <TabsTrigger value="add-staff" className="rounded-xl font-body text-xs font-semibold px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Staff / Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-5">

      <Button size="sm" onClick={() => setShowAddStudent(true)} className="rounded-xl font-body">
            <UserPlus className="w-4 h-4 mr-1" /> Add Student
          </Button>

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap gap-2 bg-card border border-border rounded-2xl p-3">
        {[
          { key: "All", label: "All Users", icon: Users, count: users.length },
          { key: "student", label: "Students", icon: GraduationCap, count: roleCounts["student"] || 0 },
          { key: "teacher", label: "Teachers", icon: BookOpen, count: roleCounts["teacher"] || 0 },
          { key: "principal", label: "Principals", icon: Shield, count: roleCounts["principal"] || 0 },
          { key: "admin", label: "Admins", icon: Shield, count: roleCounts["admin"] || 0 },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-xs font-semibold transition-all duration-200 border ${
              roleFilter === key
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:shadow-sm"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${roleFilter === key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl text-sm" />
        </div>
        {(roleFilter === "All" || roleFilter === "student") && (
          <>
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="All">All Courses</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="no-course">No Course</option>
            </select>
            <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="border border-border rounded-xl px-3 py-2 font-body text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="All">All Semesters</option>
              {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Student</DialogTitle>
            <DialogDescription className="font-body text-sm">Create a student account — email confirmation will be sent automatically</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addStudentMutation.mutate(); }} className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 py-2 border-b border-border mb-1">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">1</span>
                <h4 className="font-body text-xs font-bold text-primary uppercase tracking-wider">Personal Information</h4>
              </div>
            </div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Full Name *</label><input value={newStudent.full_name} onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })} required className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Email *</label><input type="email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} required className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Password *</label><input type="password" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} required minLength={8} placeholder={PASSWORD_REQUIREMENTS} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Student Phone</label><input value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Date of Birth</label><input type="date" value={newStudent.date_of_birth} onChange={(e) => setNewStudent({ ...newStudent, date_of_birth: e.target.value })} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Roll Number</label><input value={newStudent.roll_number} onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })} placeholder="Auto-generated if empty" className={inputClass} /></div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Gender</label>
              <select value={newStudent.gender} onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })} className={inputClass}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
              </select>
            </div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Aadhaar No.</label><input value={newStudent.aadhaar_number} onChange={(e) => setNewStudent({ ...newStudent, aadhaar_number: e.target.value })} placeholder="12-digit Aadhaar" maxLength={12} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Nationality</label><input value={newStudent.nationality} onChange={(e) => setNewStudent({ ...newStudent, nationality: e.target.value })} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Religion</label><input value={newStudent.religion} onChange={(e) => setNewStudent({ ...newStudent, religion: e.target.value })} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Caste</label><input value={newStudent.caste} onChange={(e) => setNewStudent({ ...newStudent, caste: e.target.value })} className={inputClass} /></div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Category</label>
              <select value={newStudent.category} onChange={(e) => setNewStudent({ ...newStudent, category: e.target.value })} className={inputClass}>
                <option value="">Select Category</option>
                <option value="General">General</option><option value="OBC">OBC</option><option value="SC">SC</option><option value="ST">ST</option><option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Blood Group</label>
              <select value={newStudent.blood_group} onChange={(e) => setNewStudent({ ...newStudent, blood_group: e.target.value })} className={inputClass}>
                <option value="">Select</option>
                <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className="sm:col-span-2 mt-1">
              <div className="flex items-center gap-2 py-2 border-b border-border mb-1">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">2</span>
                <h4 className="font-body text-xs font-bold text-primary uppercase tracking-wider">Academic Assignment</h4>
              </div>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course *</label>
              <select value={newStudent.course_id} onChange={(e) => setNewStudent({ ...newStudent, course_id: e.target.value })} required className={inputClass}>
                <option value="">Select Course</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Year *</label>
              <select value={newStudent.year_level} onChange={(e) => setNewStudent({ ...newStudent, year_level: e.target.value })} required className={inputClass}>
                <option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option>
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Semester *</label>
              <select value={newStudent.semester} onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value })} required className={inputClass}>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Admission Year</label>
              <input value={newStudent.admission_year} onChange={(e) => setNewStudent({ ...newStudent, admission_year: e.target.value })} className={inputClass} />
            </div>

            <div className="sm:col-span-2 mt-1">
              <div className="flex items-center gap-2 py-2 border-b border-border mb-1">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">3</span>
                <h4 className="font-body text-xs font-bold text-primary uppercase tracking-wider">Parent Information</h4>
              </div>
            </div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Father's Name</label><input value={newStudent.father_name} onChange={(e) => setNewStudent({ ...newStudent, father_name: e.target.value })} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Mother's Name</label><input value={newStudent.mother_name} onChange={(e) => setNewStudent({ ...newStudent, mother_name: e.target.value })} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Parent Phone</label><input value={newStudent.parent_phone} onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })} className={inputClass} /></div>
            <div><label className="font-body text-xs font-semibold text-foreground block mb-1.5">Address</label><input value={newStudent.address} onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })} className={inputClass} /></div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={addStudentMutation.isPending} className="w-full rounded-xl font-body">
                {addStudentMutation.isPending ? "Creating..." : "Create Student Account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Confirm Deletion</DialogTitle>
            <DialogDescription className="font-body text-sm">
              Are you sure you want to permanently delete <strong>{deleteConfirm?.full_name || deleteConfirm?.email}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl font-body">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteUserMutation.mutate(deleteConfirm.user_id)} disabled={deleteUserMutation.isPending} className="flex-1 rounded-xl font-body">
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View User Detail Dialog — Role-Specific */}
      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {viewUser?.role === "teacher" ? "Teacher Details" : viewUser?.role === "principal" ? "Principal Details" : viewUser?.role === "admin" ? "Admin Details" : "Student Details"}
            </DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4 mt-2">
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 text-center">
                {viewUser.avatarUrl ? (
                  <img src={viewUser.avatarUrl} alt={viewUser.full_name} className="w-20 h-20 rounded-2xl object-cover border-4 border-secondary/30 shadow-lg mx-auto mb-2" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">{viewUser.role === "teacher" ? "📚" : viewUser.role === "admin" ? "⚙️" : viewUser.role === "principal" ? "🏛️" : "🎓"}</span>
                  </div>
                )}
                <p className="font-display text-lg font-bold text-foreground">{viewUser.full_name || "—"}</p>
                <p className="font-body text-xs text-muted-foreground">{viewUser.email}</p>
                <span className={`inline-block mt-1 text-[10px] px-3 py-0.5 rounded-full font-body font-bold capitalize ${
                  viewUser.role === "admin" ? "bg-destructive/10 text-destructive" :
                  viewUser.role === "principal" ? "bg-secondary/20 text-secondary-foreground" :
                  viewUser.role === "teacher" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>{viewUser.role}</span>
              </div>

              {/* Student-specific details */}
              {viewUser.role === "student" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Full Name</p><p className="font-body text-sm font-semibold">{viewUser.full_name || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Course</p><p className="font-body text-sm font-semibold">{viewUser.student?.courses?.name || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Roll Number</p><p className="font-body text-sm font-semibold">{viewUser.student?.roll_number || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Semester</p><p className="font-body text-sm font-semibold">{viewUser.student?.semester || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Year Level</p><p className="font-body text-sm font-semibold">{viewUser.student?.year_level || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Admission Year</p><p className="font-body text-sm font-semibold">{viewUser.student?.admission_year || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Phone</p><p className="font-body text-sm font-semibold">{viewUser.phone || viewUser.student?.phone || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Parent Phone</p><p className="font-body text-sm font-semibold">{viewUser.student?.parent_phone || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Father's Name</p><p className="font-body text-sm font-semibold">{viewUser.student?.father_name || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Mother's Name</p><p className="font-body text-sm font-semibold">{viewUser.student?.mother_name || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Date of Birth</p><p className="font-body text-sm font-semibold">{viewUser.student?.date_of_birth || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3 col-span-2"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Address</p><p className="font-body text-sm font-semibold">{viewUser.student?.address || "—"}</p></div>
                  {/* Fee Info */}
                  <div className="col-span-2 border-t border-border pt-3 mt-1">
                    <p className="font-body text-xs font-bold text-primary uppercase tracking-wider mb-2">💰 Fee Information</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-primary/5 rounded-xl p-3 text-center"><p className="font-body text-[10px] text-muted-foreground">Yearly Fee</p><p className="font-display text-base font-bold text-foreground">₹{(viewUser.student?.total_fee || 0).toLocaleString()}</p></div>
                      <div className="bg-emerald-500/5 rounded-xl p-3 text-center"><p className="font-body text-[10px] text-muted-foreground">Paid</p><p className="font-display text-base font-bold text-emerald-600">₹{(viewUser.student?.fee_paid || 0).toLocaleString()}</p></div>
                      <div className="bg-destructive/5 rounded-xl p-3 text-center"><p className="font-body text-[10px] text-muted-foreground">Due</p><p className="font-display text-base font-bold text-destructive">₹{((viewUser.student?.total_fee || 0) - (viewUser.student?.fee_paid || 0)).toLocaleString()}</p></div>
                    </div>
                    {viewUser.student?.fee_due_date && (
                      <p className="font-body text-xs text-muted-foreground mt-2">Due Date: <span className="font-semibold text-foreground">{viewUser.student.fee_due_date}</span></p>
                    )}
                    {viewUser.student?.fee_remarks && (
                      <p className="font-body text-xs text-muted-foreground mt-1">Remarks: {viewUser.student.fee_remarks}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Teacher-specific details */}
              {viewUser.role === "teacher" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Full Name</p><p className="font-body text-sm font-semibold">{viewUser.full_name || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Employee ID</p><p className="font-body text-sm font-semibold">{viewUser.teacher?.employee_id || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Phone</p><p className="font-body text-sm font-semibold">{viewUser.phone || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Department</p><p className="font-body text-sm font-semibold">{(viewUser.teacher?.departments as any)?.name || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Qualification</p><p className="font-body text-sm font-semibold">{viewUser.teacher?.qualification || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Experience</p><p className="font-body text-sm font-semibold">{viewUser.teacher?.experience || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3 col-span-2"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Subjects</p><p className="font-body text-sm font-semibold">{viewUser.teacher?.subjects?.length > 0 ? viewUser.teacher.subjects.join(", ") : "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Status</p><p className="font-body text-sm font-semibold">{viewUser.teacher?.is_active ? "Active" : "Inactive"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Email</p><p className="font-body text-sm font-semibold">{viewUser.email || "—"}</p></div>
                </div>
              )}

              {/* Principal/Admin details */}
              {(viewUser.role === "principal" || viewUser.role === "admin") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Full Name</p><p className="font-body text-sm font-semibold">{viewUser.full_name || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Email</p><p className="font-body text-sm font-semibold">{viewUser.email || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Phone</p><p className="font-body text-sm font-semibold">{viewUser.phone || "—"}</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Role</p><p className="font-body text-sm font-semibold capitalize">{viewUser.role}</p></div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {viewUser.phone && (
                  <a href={`tel:${viewUser.phone}`}>
                    <Button size="sm" variant="outline" className="rounded-xl font-body text-xs"><Phone className="w-3 h-3 mr-1" /> Call</Button>
                  </a>
                )}
                {viewUser.role === "student" && viewUser.student?.parent_phone && (
                  <a href={`tel:${viewUser.student.parent_phone}`}>
                    <Button size="sm" variant="outline" className="rounded-xl font-body text-xs"><Phone className="w-3 h-3 mr-1" /> Call Parent</Button>
                  </a>
                )}
                <Button size="sm" variant="outline" onClick={() => { setViewUser(null); startEdit(viewUser); }} className="rounded-xl font-body text-xs">
                  <Edit3 className="w-3 h-3 mr-1" /> Edit Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Users List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3 rounded-lg" />
                    <Skeleton className="h-3 w-1/2 rounded-lg" />
                  </div>
                  <Skeleton className="w-24 h-8 rounded-xl shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.map((u: any, idx: number) => (
          <div
            key={u.id}
            className="relative overflow-hidden bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group card-stack border-glow"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none spotlight" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {editingId === u.user_id ? (
              <div className="relative space-y-2">
                <p className="font-body text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                  Editing {editingRole === "teacher" ? "Teacher" : editingRole === "principal" ? "Principal" : editingRole === "admin" ? "Admin" : "Student"} Info
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Full Name" />
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Phone" />

                  {editingRole === "teacher" ? (
                    <>
                      <Input value={editForm.employee_id} onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Employee ID" />
                      <select value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })} className="h-9 text-sm rounded-xl border border-input bg-background px-3">
                        <option value="">Select Department</option>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                      </select>
                      <Input value={editForm.qualification} onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Qualification (e.g. M.Sc)" />
                      <Input value={editForm.experience} onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Experience (e.g. 5 Years)" />
                      <Input value={editForm.subjects} onChange={(e) => setEditForm({ ...editForm, subjects: e.target.value })} className="h-9 text-sm rounded-xl lg:col-span-3 sm:col-span-2" placeholder="Subjects (comma-separated)" />
                    </>
                  ) : editingRole === "student" ? (
                    <>
                      <Input value={editForm.roll_number} onChange={(e) => setEditForm({ ...editForm, roll_number: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Roll Number" />
                      <Input value={editForm.parent_phone} onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Parent Phone" />
                      <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="DOB" />
                      <select value={editForm.course_id} onChange={(e) => setEditForm({ ...editForm, course_id: e.target.value })} className="h-9 text-sm rounded-xl border border-input bg-background px-3">
                        <option value="">Select Course</option>
                        {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <select value={editForm.semester} onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })} className="h-9 text-sm rounded-xl border border-input bg-background px-3">
                        {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
                      </select>
                      <Input type="number" value={editForm.total_fee} onChange={(e) => setEditForm({ ...editForm, total_fee: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Yearly Fee" />
                      <Input type="number" value={editForm.fee_paid} onChange={(e) => setEditForm({ ...editForm, fee_paid: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Fee Paid" />
                      <Input type="date" value={editForm.fee_due_date} onChange={(e) => setEditForm({ ...editForm, fee_due_date: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Fee Due Date" />
                      <Input value={editForm.fee_remarks} onChange={(e) => setEditForm({ ...editForm, fee_remarks: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Fee Remarks" />
                      <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Address" />
                      <Input value={editForm.aadhaar_number} onChange={(e) => setEditForm({ ...editForm, aadhaar_number: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Aadhaar No." />
                      <Input value={editForm.nationality} onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Nationality" />
                      <Input value={editForm.religion} onChange={(e) => setEditForm({ ...editForm, religion: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Religion" />
                      <Input value={editForm.caste} onChange={(e) => setEditForm({ ...editForm, caste: e.target.value })} className="h-9 text-sm rounded-xl" placeholder="Caste" />
                      <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="h-9 text-sm rounded-xl border border-input bg-background px-3">
                        <option value="">Category</option>
                        <option value="General">General</option><option value="OBC">OBC</option><option value="SC">SC</option><option value="ST">ST</option><option value="Other">Other</option>
                      </select>
                      <select value={editForm.blood_group} onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })} className="h-9 text-sm rounded-xl border border-input bg-background px-3">
                        <option value="">Blood Group</option>
                        <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                      <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} className="h-9 text-sm rounded-xl border border-input bg-background px-3">
                        <option value="">Gender</option>
                        <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                      </select>
                    </>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateProfileMutation.mutate({ userId: u.user_id, role: editingRole, ...editForm })} className="flex-1 text-xs rounded-xl"><Save className="w-3 h-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="text-xs rounded-xl"><X className="w-3 h-3" /></Button>
                </div>
              </div>
            ) : (
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 font-bold text-primary font-display text-base group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-sm font-bold text-foreground">{u.full_name || "—"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-body font-bold ${
                        u.role === "admin" ? "bg-destructive/10 text-destructive" :
                        u.role === "principal" ? "bg-secondary/20 text-secondary-foreground" :
                        u.role === "teacher" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      }`}>{u.role}</span>
                      {u.student?.courses?.code && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body">{u.student.courses.code}</span>}
                      {u.role === "teacher" && u.teacher?.employee_id && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground font-body">{u.teacher.employee_id}</span>}
                    </div>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">{u.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {u.phone && <a href={`tel:${u.phone}`} className="font-body text-xs text-primary hover:underline flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</a>}
                      {u.student?.parent_phone && <a href={`tel:${u.student.parent_phone}`} className="font-body text-xs text-muted-foreground hover:text-primary flex items-center gap-1"><Phone className="w-3 h-3" /> Parent</a>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select value={u.role} onChange={(e) => updateRoleMutation.mutate({ userId: u.user_id, newRole: e.target.value })}
                    className="text-[10px] rounded-xl border border-input bg-background px-2 py-1.5 font-body font-semibold hidden sm:block focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="principal">Principal</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => u.role === "student" ? navigate(`/dashboard/admin/users/${u.user_id}`) : setViewUser(u)} className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary hover:scale-110 transition-all duration-200" title="View"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => startEdit(u)} className="p-2 rounded-xl hover:bg-secondary/10 text-muted-foreground hover:text-secondary-foreground hover:scale-110 transition-all duration-200" title="Edit"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => { setResetPwUser(u); setNewPassword(""); }}
                    className="p-2 rounded-xl hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 hover:scale-110 transition-all duration-200" title="Reset Password"><KeyRound className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm(u)}
                    className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive hover:scale-110 transition-all duration-200" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!isLoading && filtered.length === 0 && <p className="text-center py-8 font-body text-sm text-muted-foreground">No users found.</p>}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwUser} onOpenChange={() => setResetPwUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Reset Password</DialogTitle>
            <DialogDescription className="font-body text-sm">
              Set a new password for <strong>{resetPwUser?.full_name || resetPwUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const pwCheck = validatePassword(newPassword); if (!pwCheck.valid) { toast.error(pwCheck.message); return; } resetPasswordMutation.mutate({ userId: resetPwUser.user_id, password: newPassword }); }} className="space-y-4 mt-2">
            <div>
              <label className="font-body text-xs font-semibold text-foreground block mb-1.5">New Password *</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder={PASSWORD_REQUIREMENTS} className="rounded-xl" />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setResetPwUser(null)} className="flex-1 rounded-xl font-body">Cancel</Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending} className="flex-1 rounded-xl font-body">
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-5">
          <StudentsDirectory users={users} courses={courses} isLoading={isLoading} navigate={navigate} />
        </TabsContent>

        <TabsContent value="add-staff">
          <AdminAddStaff />
        </TabsContent>
      </Tabs>
    </div>
  );
}
