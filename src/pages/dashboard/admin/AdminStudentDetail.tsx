import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, User, BookOpen, Phone, Mail, MapPin, Calendar, GraduationCap,
  Upload, Download, Trash2, FileText, IndianRupee, CheckCircle, AlertCircle, Eye,
  Edit3, Save, X, Award, Clock, BarChart3
} from "lucide-react";
import { generateStudyCertificate } from "@/lib/generate-study-certificate";

import { formatAadhaar } from "@/lib/format-aadhaar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const DOCUMENT_TYPES = [
  { key: "10th_marks_card", label: "10th Marks Card" },
  { key: "12th_marks_card", label: "12th Marks Card" },
  { key: "transfer_certificate", label: "Transfer Certificate" },
  { key: "migration_certificate", label: "Migration Certificate" },
  { key: "aadhaar_card", label: "Aadhaar Card" },
  { key: "passport_photo", label: "Passport Photo" },
  { key: "caste_certificate", label: "Caste Certificate" },
  { key: "other", label: "Other Document" },
];

export default function AdminStudentDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certProgress, setCertProgress] = useState(0);

  const { data: student, isLoading } = useQuery({
    queryKey: ["admin-student-detail", userId],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", userId!).maybeSingle();
      const { data: studentData } = await supabase.from("students").select("*, courses(name, code)").eq("user_id", userId!).maybeSingle();
      if (!studentData) return null;
      const { data: sensitive } = await supabase
        .from("student_sensitive_data")
        .select("aadhaar_number, religion, caste, category")
        .eq("student_id", studentData.id)
        .maybeSingle();
      const fallbackProfile = profile || { user_id: userId!, full_name: "Unknown", email: "", phone: "", avatar_url: "", created_at: "", updated_at: "", id: "" };
      return { ...studentData, ...(sensitive || {}), profile: fallbackProfile };
    },
    enabled: !!userId,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["student-documents", student?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("student_documents").select("*").eq("student_id", student!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!student?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("fee_payments").select("*").eq("student_id", student!.id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!student?.id,
  });

  const { data: semFees = [] } = useQuery({
    queryKey: ["student-sem-fees", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("semester_fees").select("*").eq("student_id", student!.id).order("semester");
      return data || [];
    },
    enabled: !!student?.id,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["student-attendance-detail", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("status, date, subject").eq("student_id", student!.id);
      return data || [];
    },
    enabled: !!student?.id,
  });

  const { data: marksData } = useQuery({
    queryKey: ["student-marks-detail", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("marks").select("subject, obtained_marks, max_marks, exam_type, semester").eq("student_id", student!.id);
      return data || [];
    },
    enabled: !!student?.id,
  });

  const startEditing = () => {
    if (!student) return;
    setEditForm({
      full_name: student.profile?.full_name || "",
      phone: student.phone || student.profile?.phone || "",
      date_of_birth: student.date_of_birth || "",
      address: student.address || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      parent_phone: student.parent_phone || "",
      roll_number: student.roll_number || "",
      semester: String(student.semester || "1"),
      year_level: String(student.year_level || "1"),
      admission_year: String(student.admission_year || ""),
      course_id: student.course_id || "",
      gender: (student as any).gender || "",
      aadhaar_number: (student as any).aadhaar_number || "",
      nationality: (student as any).nationality || "",
      religion: (student as any).religion || "",
      caste: (student as any).caste || "",
      category: (student as any).category || "",
      blood_group: (student as any).blood_group || "",
    });
    setEditing(true);
  };

  const updateStudentMutation = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      // Update profile table
      const { error: profileError } = await supabase.from("profiles").update({
        full_name: form.full_name || "",
        phone: form.phone || "",
      }).eq("user_id", userId!);
      if (profileError) throw profileError;

      // Update students table
      const studentUpdate: any = {
        phone: form.phone || "",
        parent_phone: form.parent_phone || "",
        address: form.address || "",
        date_of_birth: form.date_of_birth || null,
        father_name: form.father_name || "",
        mother_name: form.mother_name || "",
        semester: parseInt(form.semester) || 1,
        year_level: parseInt(form.year_level) || 1,
        admission_year: parseInt(form.admission_year) || null,
        course_id: form.course_id || null,
        gender: form.gender || "",
        nationality: form.nationality || "",
        blood_group: form.blood_group || "",
      };

      const nextRoll = (form.roll_number || "").trim();
      const currentRoll = (student?.roll_number || "").trim();
      const rollChanged = nextRoll.length > 0 && nextRoll !== currentRoll;

      // Only update roll_number when changed, and ensure it's unique first
      if (rollChanged) {
        const { data: existingRoll, error: rollCheckError } = await supabase
          .from("students")
          .select("id")
          .eq("roll_number", nextRoll)
          .neq("user_id", userId!)
          .limit(1);

        if (rollCheckError) throw rollCheckError;
        if (existingRoll && existingRoll.length > 0) {
          throw new Error(`Roll number \"${nextRoll}\" already exists. Please use a unique roll number.`);
        }

        studentUpdate.roll_number = nextRoll;
      }

      const { error: studentError } = await supabase.from("students").update(studentUpdate).eq("user_id", userId!);
      if (studentError) throw studentError;

      // Update sensitive data in protected table
      if (student?.id) {
        const { error: sensError } = await supabase.from("student_sensitive_data").upsert({
          student_id: student.id,
          aadhaar_number: form.aadhaar_number || null,
          religion: form.religion || null,
          caste: form.caste || null,
          category: form.category || null,
        }, { onConflict: "student_id" });
        if (sensError) throw sensError;
      }
    },
    onSuccess: () => {
      toast.success("Student details updated successfully!");
      qc.invalidateQueries({ queryKey: ["admin-student-detail", userId] });
      setEditing(false);
    },
    onError: (e: any) => {
      const msg = typeof e?.message === "string" ? e.message : "Update failed";
      if (msg.includes("students_roll_number_key") || msg.includes("duplicate key value")) {
        toast.error("Roll number already exists. Keep the current roll number or enter a unique one.");
        return;
      }
      toast.error("Update failed: " + msg);
    },
  });

  const uploadDocument = async (docType: string, file: File) => {
    if (!student || !user) return;
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const path = `${student.id}/${docType}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("student-documents").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("student-documents").getPublicUrl(path);
      
      const { error: dbError } = await (supabase as any).from("student_documents").insert({
        student_id: student.id,
        document_type: docType,
        file_name: file.name,
        file_url: path,
        uploaded_by: user.id,
      });
      if (dbError) throw dbError;

      toast.success(`${DOCUMENT_TYPES.find(d => d.key === docType)?.label} uploaded!`);
      qc.invalidateQueries({ queryKey: ["student-documents"] });
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
    } finally {
      setUploading(null);
    }
  };

  const downloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from("student-documents").download(doc.file_url);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(`Download failed: ${e.message}`);
    }
  };

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("student-documents").remove([doc.file_url]);
      const { error } = await (supabase as any).from("student_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["student-documents"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16">
        <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-body text-muted-foreground">Student not found.</p>
        <Link to="/dashboard/admin/users" className="font-body text-sm text-primary hover:underline mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }

  const totalFee = student.total_fee || 0;
  const feePaid = student.fee_paid || 0;
  const feeRemaining = Math.max(0, totalFee - feePaid);
  const pct = totalFee > 0 ? Math.round((feePaid / totalFee) * 100) : 0;

  const renderEditField = (label: string, fieldKey: string, type = "text", options?: { value: string; label: string }[]) => (
    <div className="bg-muted/30 rounded-xl p-3.5">
      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      {options ? (
        <select
          value={editForm[fieldKey] || ""}
          onChange={(e) => setEditForm(prev => ({ ...prev, [fieldKey]: e.target.value }))}
          className="w-full h-8 text-sm rounded-lg border border-input bg-background px-2 font-body"
        >
          <option value="">Select...</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <Input
          type={type}
          value={editForm[fieldKey] || ""}
          onChange={(e) => setEditForm(prev => ({ ...prev, [fieldKey]: e.target.value }))}
          className="h-8 text-sm rounded-lg"
        />
      )}
    </div>
  );

  const InfoCard = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
    <div className="bg-muted/30 rounded-xl p-3.5 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
        <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-body text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in relative">
      {/* Certificate Generation Loading Overlay */}
      {generatingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Generating Certificate</h3>
              <p className="font-body text-sm text-muted-foreground mt-1">Please wait while the study certificate is being prepared...</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${certProgress}%` }}
              />
            </div>
            <p className="font-body text-xs text-muted-foreground">{certProgress}% complete</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Link to="/dashboard/admin/users" className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-4 flex-1">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-secondary/30 shadow-lg" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">🎓</div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5 mb-1">
                <span className="font-body text-[10px] text-primary font-semibold uppercase tracking-wider">Student Profile</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">{student.profile?.full_name || "—"}</h2>
              <p className="font-body text-xs text-muted-foreground">{student.profile?.email} · {student.roll_number}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!editing ? (
              <Button size="sm" variant="outline" className="rounded-xl font-body text-xs" onClick={startEditing}>
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            ) : (
              <>
                <Button size="sm" className="rounded-xl font-body text-xs" disabled={updateStudentMutation.isPending} onClick={() => updateStudentMutation.mutate(editForm)}>
                  <Save className="w-3.5 h-3.5 mr-1" /> {updateStudentMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl font-body text-xs" onClick={() => setEditing(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" className="rounded-xl font-body text-xs" disabled={generatingCert} onClick={async () => {
              setGeneratingCert(true);
              setCertProgress(0);
              try {
                // Simulate progress stages
                setCertProgress(15);
                await new Promise(r => setTimeout(r, 200));
                setCertProgress(35);
                const currentYear = new Date().getFullYear();
                const academicYear = `${currentYear - 1}-${String(currentYear).slice(2)}`;
                setCertProgress(55);
                await new Promise(r => setTimeout(r, 200));
                setCertProgress(75);
                await generateStudyCertificate({
                  fullName: student.profile?.full_name || "",
                  fatherName: student.father_name || "",
                  courseName: student.courses?.name || "",
                  semester: student.semester || 1,
                  rollNumber: student.roll_number || "",
                  gender: (student as any).gender || "",
                  aadhaarNumber: (student as any).aadhaar_number || "",
                  dateOfBirth: student.date_of_birth || "",
                  nationality: (student as any).nationality || "",
                  caste: (student as any).caste || "",
                  category: (student as any).category || "",
                  academicYear,
                });
                setCertProgress(100);
                await new Promise(r => setTimeout(r, 400));
              } catch (e: any) {
                toast.error("Certificate generation failed: " + e.message);
              } finally {
                setGeneratingCert(false);
                setCertProgress(0);
              }
            }}>
              <Award className="w-3.5 h-3.5 mr-1" /> {generatingCert ? "Generating..." : "Study Certificate"}
            </Button>
            <Link to={`/dashboard/admin/fees/${student.id}`}>
              <Button size="sm" variant="outline" className="rounded-xl font-body text-xs">
                <IndianRupee className="w-3.5 h-3.5 mr-1" /> Fee Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Personal Information
        </h3>
        {editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {renderEditField("Full Name", "full_name")}
            {renderEditField("Phone", "phone", "tel")}
            {renderEditField("Date of Birth", "date_of_birth", "date")}
            {renderEditField("Gender", "gender", "text", [
              { value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" },
            ])}
            {renderEditField("Aadhaar No.", "aadhaar_number")}
            {renderEditField("Nationality", "nationality")}
            {renderEditField("Religion", "religion")}
            {renderEditField("Caste", "caste")}
            {renderEditField("Category", "category", "text", [
              { value: "General", label: "General" }, { value: "OBC", label: "OBC" }, { value: "SC", label: "SC" }, { value: "ST", label: "ST" },
            ])}
            {renderEditField("Blood Group", "blood_group", "text", [
              { value: "A+", label: "A+" }, { value: "A-", label: "A-" }, { value: "B+", label: "B+" }, { value: "B-", label: "B-" },
              { value: "O+", label: "O+" }, { value: "O-", label: "O-" }, { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" },
            ])}
            <div className="col-span-2">
              {renderEditField("Address", "address")}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <InfoCard label="Full Name" value={student.profile?.full_name} icon={User} />
            <InfoCard label="Email" value={student.profile?.email} icon={Mail} />
            <InfoCard label="Phone" value={student.profile?.phone || student.phone} icon={Phone} />
            <InfoCard label="Date of Birth" value={student.date_of_birth ? format(new Date(student.date_of_birth), "dd MMM yyyy") : ""} icon={Calendar} />
            <InfoCard label="Gender" value={(student as any).gender} />
            <InfoCard label="Aadhaar No." value={formatAadhaar((student as any).aadhaar_number)} />
            <InfoCard label="Nationality" value={(student as any).nationality} />
            <InfoCard label="Religion" value={(student as any).religion} />
            <InfoCard label="Caste" value={(student as any).caste} />
            <InfoCard label="Category" value={(student as any).category} />
            <InfoCard label="Blood Group" value={(student as any).blood_group} />
            <InfoCard label="Address" value={student.address} icon={MapPin} />
          </div>
        )}
      </div>

      {/* Academic Info */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" /> Academic Information
        </h3>
        {editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {renderEditField("Course", "course_id", "text", courses.map((c: any) => ({ value: c.id, label: `${c.name} (${c.code})` })))}
            {renderEditField("Roll Number", "roll_number")}
            {renderEditField("Semester", "semester", "number")}
            {renderEditField("Year Level", "year_level", "number")}
            {renderEditField("Admission Year", "admission_year", "number")}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <InfoCard label="Course" value={`${(student.courses as any)?.name || "—"} (${(student.courses as any)?.code || ""})`} icon={BookOpen} />
            <InfoCard label="Roll Number" value={student.roll_number} />
            <InfoCard label="Semester" value={String(student.semester || "—")} />
            <InfoCard label="Year Level" value={String(student.year_level || "—")} />
            <InfoCard label="Admission Year" value={String(student.admission_year || "—")} />
            <InfoCard label="Joined On" value={(student as any).joined_at ? format(new Date((student as any).joined_at), "dd MMM yyyy, hh:mm a") : "—"} icon={Clock} />
            <InfoCard label="Status" value={student.is_active ? "Active" : "Inactive"} />
          </div>
        )}
      </div>

      {/* Parent Info */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Parent Information
        </h3>
        {editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {renderEditField("Father's Name", "father_name")}
            {renderEditField("Mother's Name", "mother_name")}
            {renderEditField("Parent Phone", "parent_phone", "tel")}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoCard label="Father's Name" value={student.father_name} />
            <InfoCard label="Mother's Name" value={student.mother_name} />
            <InfoCard label="Parent Phone" value={student.parent_phone} icon={Phone} />
          </div>
        )}
      </div>

      {/* Attendance & Performance Overview */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Attendance & Performance
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {(() => {
            const total = attendanceData?.length || 0;
            const present = attendanceData?.filter((a: any) => a.status === "present").length || 0;
            const absent = total - present;
            const pctAtt = total > 0 ? Math.round((present / total) * 100) : 0;
            const totalMarks = marksData?.length || 0;
            const avgMarks = totalMarks > 0 ? Math.round((marksData || []).reduce((s: number, m: any) => s + (m.obtained_marks / m.max_marks) * 100, 0) / totalMarks) : 0;
            return (
              <>
                <div className="bg-primary/5 rounded-xl p-3.5 text-center">
                  <p className="font-body text-[10px] text-muted-foreground uppercase">Attendance</p>
                  <p className={`font-display text-lg font-bold ${pctAtt >= 75 ? "text-emerald-600" : "text-destructive"}`}>{pctAtt}%</p>
                  <p className="font-body text-[10px] text-muted-foreground">{present}/{total} classes</p>
                </div>
                <div className="bg-emerald-500/5 rounded-xl p-3.5 text-center">
                  <p className="font-body text-[10px] text-muted-foreground uppercase">Present</p>
                  <p className="font-display text-lg font-bold text-emerald-600">{present}</p>
                </div>
                <div className="bg-destructive/5 rounded-xl p-3.5 text-center">
                  <p className="font-body text-[10px] text-muted-foreground uppercase">Absent</p>
                  <p className="font-display text-lg font-bold text-destructive">{absent}</p>
                </div>
                <div className="bg-blue-500/5 rounded-xl p-3.5 text-center">
                  <p className="font-body text-[10px] text-muted-foreground uppercase">Avg Marks</p>
                  <p className="font-display text-lg font-bold text-blue-600">{avgMarks}%</p>
                </div>
              </>
            );
          })()}
        </div>
        {marksData && marksData.length > 0 && (
          <div>
            <p className="font-body text-xs font-semibold text-muted-foreground mb-2">Subject Performance</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(() => {
                const subjectMap: Record<string, { total: number; count: number }> = {};
                (marksData || []).forEach((m: any) => {
                  if (!subjectMap[m.subject]) subjectMap[m.subject] = { total: 0, count: 0 };
                  subjectMap[m.subject].total += (m.obtained_marks / m.max_marks) * 100;
                  subjectMap[m.subject].count++;
                });
                return Object.entries(subjectMap).map(([subject, { total, count }]) => {
                  const avg = Math.round(total / count);
                  return (
                    <div key={subject} className="bg-muted/30 rounded-xl p-3">
                      <p className="font-body text-xs font-semibold text-foreground truncate">{subject}</p>
                      <p className={`font-body text-sm font-bold ${avg >= 50 ? "text-emerald-600" : "text-destructive"}`}>{avg}%</p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Fee Summary */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary" /> Fee Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-primary/5 rounded-xl p-3.5 text-center">
            <p className="font-body text-[10px] text-muted-foreground uppercase">Yearly Fee</p>
            <p className="font-display text-lg font-bold text-foreground">₹{totalFee.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-500/5 rounded-xl p-3.5 text-center">
            <p className="font-body text-[10px] text-muted-foreground uppercase">Paid</p>
            <p className="font-display text-lg font-bold text-emerald-600">₹{feePaid.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl p-3.5 text-center ${feeRemaining > 0 ? "bg-destructive/5" : "bg-emerald-500/5"}`}>
            <p className="font-body text-[10px] text-muted-foreground uppercase">Due</p>
            <p className={`font-display text-lg font-bold ${feeRemaining > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {feeRemaining > 0 ? `₹${feeRemaining.toLocaleString()}` : "✓ Cleared"}
            </p>
          </div>
          <div className="bg-primary/5 rounded-xl p-3.5 text-center">
            <p className="font-body text-[10px] text-muted-foreground uppercase">Collection</p>
            <p className="font-display text-lg font-bold text-primary">{pct}%</p>
          </div>
        </div>

        {semFees.length > 0 && (
          <div className="space-y-2">
            <p className="font-body text-xs font-semibold text-muted-foreground">Semester-wise Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {semFees.map((sf: any) => {
                const semPaid = payments.filter((p: any) => p.semester === sf.semester).reduce((s: number, p: any) => s + Number(p.amount), 0);
                const due = Math.max(0, Number(sf.fee_amount) - semPaid);
                return (
                  <div key={sf.semester} className="bg-muted/30 rounded-xl p-3">
                    <p className="font-body text-xs font-semibold">Semester {sf.semester}</p>
                    <p className="font-body text-[10px] text-muted-foreground">Fee: ₹{Number(sf.fee_amount).toLocaleString()}</p>
                    <p className={`font-body text-[10px] ${due > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {due > 0 ? `Due: ₹${due.toLocaleString()}` : "✓ Cleared"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {payments.length > 0 && (
          <div className="mt-4">
            <p className="font-body text-xs font-semibold text-muted-foreground mb-2">Recent Payments</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {payments.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-body text-xs font-semibold text-foreground">₹{Number(p.amount).toLocaleString()}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{format(new Date(p.created_at), "dd MMM yyyy")} · {p.payment_method} {p.semester ? `· Sem ${p.semester}` : ""}</p>
                  </div>
                  <span className="font-mono text-[10px] text-primary">{p.receipt_number || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Student Documents
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {DOCUMENT_TYPES.map((dt) => {
            const existingDoc = documents.find((d: any) => d.document_type === dt.key);
            return (
              <div key={dt.key} className={`relative rounded-xl border-2 border-dashed p-3 text-center transition-all ${existingDoc ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                <p className="font-body text-xs font-semibold text-foreground mb-1.5">{dt.label}</p>
                {existingDoc ? (
                  <div className="space-y-1.5">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                    <p className="font-body text-[10px] text-muted-foreground truncate">{existingDoc.file_name}</p>
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => downloadDocument(existingDoc)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteDocMutation.mutate(existingDoc)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className={`w-5 h-5 mx-auto mb-1 ${uploading === dt.key ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
                    <p className="font-body text-[10px] text-primary font-semibold">{uploading === dt.key ? "Uploading..." : "Upload"}</p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      disabled={!!uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error("File too large (max 10MB)");
                            return;
                          }
                          uploadDocument(dt.key, file);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {documents.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="font-body text-xs font-semibold text-muted-foreground mb-2">All Uploaded Documents ({documents.length})</p>
            <div className="space-y-1.5">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-body text-xs font-semibold text-foreground truncate">{doc.file_name}</p>
                      <p className="font-body text-[10px] text-muted-foreground">
                        {DOCUMENT_TYPES.find(d => d.key === doc.document_type)?.label || doc.document_type} · {format(new Date(doc.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => downloadDocument(doc)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteDocMutation.mutate(doc)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
