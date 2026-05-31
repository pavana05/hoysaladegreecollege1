import { useState, useRef, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, Phone, MapPin, Calendar, Users, GraduationCap, Sparkles, CheckCircle, BookOpen, Award, ChevronRight, ArrowRight, Camera, X, RefreshCw, Droplet, Flag, School, ShieldAlert, UserCheck, Heart, AlertCircle, FileCheck2, Pencil } from "lucide-react";
import collegeLogo from "@/assets/college-logo.png";
import { Button } from "@/components/ui/button";
import { PremiumSelect } from "@/components/PremiumSelect";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Course { id: string; name: string; code: string; }

const QUALIFICATIONS = [
  "12th PUC - Science (PCMB/PCMC)",
  "12th PUC - Commerce",
  "12th PUC - Arts/Humanities",
  "CBSE Class 12",
  "ICSE Class 12",
  "Diploma",
  "Other",
];

const PERCENTAGE_RANGES = [
  "Above 90%",
  "80% - 89%",
  "70% - 79%",
  "60% - 69%",
  "50% - 59%",
  "Below 50%",
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Unknown"];
const RELATIONS = ["Father", "Mother", "Guardian", "Sibling", "Spouse", "Relative", "Other"];

export default function Register() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [resending, setResending] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [success, setSuccess] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const draftKeyRef = useRef<string | null>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    // Personal
    fullName: "", email: "", password: "", confirmPassword: "",
    dateOfBirth: "", gender: "", bloodGroup: "", nationality: "Indian",
    aadhaar: "",
    // Academic
    courseId: "", uucmsId: "", previousQualification: "", previousPercentage: "", previousSchool: "",
    // Contact
    phone: "", address: "",
    fatherName: "", motherName: "", parentPhone: "",
    emergencyContactName: "", emergencyContactRelation: "", emergencyContactPhone: "",
  });

  const registerFieldRef = (name: string) => (el: HTMLElement | null) => { fieldRefs.current[name] = el; };
  const focusField = (name: string) => {
    const el = fieldRefs.current[name];
    if (el && typeof (el as HTMLInputElement).focus === "function") {
      (el as HTMLInputElement).focus();
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const clearErr = (k: string) => { if (fieldErrors[k]) setFieldErrors(p => { const n = { ...p }; delete n[k]; return n; }); };
  const setF = (k: string, v: string) => { set(k, v); clearErr(k); };

  useEffect(() => {
    supabase.from("courses").select("id, name, code").eq("is_active", true).order("name")
      .then(({ data }) => setCourses(data || []));
  }, []);

  // ============= DRAFT PERSISTENCE =============
  // Load draft on mount (if any)
  useEffect(() => {
    const DRAFT_KEY_STORAGE = "hdc_reg_draft_key";
    let key = localStorage.getItem(DRAFT_KEY_STORAGE);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(DRAFT_KEY_STORAGE, key);
    }
    draftKeyRef.current = key;

    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("registration_drafts")
          .select("data, step")
          .eq("draft_key", key)
          .maybeSingle();
        if (data?.data && typeof data.data === "object") {
          setForm(prev => ({ ...prev, ...data.data, password: "", confirmPassword: "" }));
          if (data.step && data.step >= 1 && data.step <= 4) setStep(data.step);
          setDraftRestored(true);
          toast.success("Welcome back — we restored your draft", { description: "Please re-enter your password to continue." });
        }
      } catch {
        /* draft restore is best-effort */
      }
    })();
  }, []);

  // Auto-save draft (debounced) — excludes password fields
  useEffect(() => {
    if (!draftKeyRef.current || success) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(async () => {
      const { password, confirmPassword, ...safe } = form;
      try {
        await (supabase as any)
          .from("registration_drafts")
          .upsert({
            draft_key: draftKeyRef.current,
            data: safe,
            step,
          }, { onConflict: "draft_key" });
      } catch {
        /* silent — drafts are best-effort */
      }
    }, 1200);
    return () => { if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current); };
  }, [form, step, success]);

  const clearDraft = async () => {
    if (!draftKeyRef.current) return;
    try {
      await (supabase as any).from("registration_drafts").delete().eq("draft_key", draftKeyRef.current);
      localStorage.removeItem("hdc_reg_draft_key");
    } catch { /* ignore */ }
  };

  // Announce step changes to screen readers and move focus to step heading
  useEffect(() => {
    setAnnouncement(`Step ${step} of 4: ${["Personal Details","Academic Background","Contact Information","Review & Confirm"][step-1]}`);
    setTimeout(() => stepHeadingRef.current?.focus(), 50);
  }, [step]);



  const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_PHOTO_TYPES.includes(f.type.toLowerCase())) {
      setPhotoError("Only JPG, PNG, or WebP images are allowed");
      toast.error("Unsupported photo format");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_PHOTO_SIZE) {
      setPhotoError(`Photo must be under 5 MB (selected ${(f.size / 1024 / 1024).toFixed(1)} MB)`);
      toast.error("Photo too large");
      e.target.value = "";
      return;
    }
    setPhotoError(null);
    setPendingPhoto(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const clearPhoto = () => { setPendingPhoto(null); setPhotoPreview(null); setPhotoError(null); setUploadProgress(null); };

  const uploadPendingPhoto = async (userId: string) => {
    if (!pendingPhoto) return null;
    try {
      const ext = (pendingPhoto.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apikey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const baseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      if (!token || !baseUrl) throw new Error("Not authenticated");

      setUploadProgress(0);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${baseUrl}/storage/v1/object/uploads/${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("apikey", apikey);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", pendingPhoto.type);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 95));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(xhr.responseText || "Upload failed"));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(pendingPhoto);
      });

      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", userId);
      await supabase.from("students").update({ avatar_url: pub.publicUrl }).eq("user_id", userId);
      setUploadProgress(100);
      return pub.publicUrl;
    } catch (e) {
      console.error("photo upload failed", e);
      setUploadProgress(null);
      toast.error("Profile photo upload failed — you can re-upload from your profile.");
      return null;
    }
  };

  const handleResendVerification = async () => {
    if (!form.email) { toast.error("Email missing"); return; }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: form.email,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
      toast.success("Verification email re-sent", { description: "Check your inbox & spam folder." });
    } catch (e: any) {
      toast.error(e.message || "Could not resend email");
    } finally {
      setResending(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const validatePersonal = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) errs.fullName = "Please enter your full name (min 2 characters)";
    if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Please enter a valid email address";
    if (!form.password || form.password.length < 6) errs.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords don't match";
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    else {
      const age = (Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 14 || age > 80) errs.dateOfBirth = "Please enter a valid date of birth (age 14–80)";
    }
    if (!form.gender) errs.gender = "Please select a gender";
    const aDigits = form.aadhaar.replace(/\D/g, "");
    if (!/^\d{12}$/.test(aDigits)) errs.aadhaar = "Aadhaar must be exactly 12 digits";

    setFieldErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length) {
      toast.error("Please fix the highlighted fields");
      setAnnouncement(`${keys.length} field${keys.length > 1 ? "s" : ""} need attention. ${errs[keys[0]]}`);
      setTimeout(() => focusField(keys[0]), 50);
      return false;
    }
    return true;
  };

  const validateAcademic = () => {
    const errs: Record<string, string> = {};
    if (!form.uucmsId.trim() || form.uucmsId.trim().length < 4) errs.uucmsId = "Please enter a valid UUCMS ID";
    if (!form.courseId) errs.courseId = "Please select your course";
    if (!form.previousQualification) errs.previousQualification = "Please select your previous qualification";
    if (!form.previousPercentage) errs.previousPercentage = "Please select your score range";
    if (!form.previousSchool.trim()) errs.previousSchool = "Please enter your previous school / college";

    setFieldErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length) {
      toast.error("Please fix the highlighted fields");
      setAnnouncement(`${keys.length} field${keys.length > 1 ? "s" : ""} need attention. ${errs[keys[0]]}`);
      setTimeout(() => focusField(keys[0]), 50);
      return false;
    }
    return true;
  };

  const validateContact = () => {
    const errs: Record<string, string> = {};
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(phoneDigits)) errs.phone = "Enter a valid 10-digit mobile number";
    if (!form.address.trim() || form.address.trim().length < 10) errs.address = "Please enter a complete address (minimum 10 characters)";

    const emName = form.emergencyContactName.trim();
    if (!emName) errs.emergencyContactName = "Emergency contact name is required";
    else if (emName.length < 2) errs.emergencyContactName = "Name must be at least 2 characters";
    else if (!/^[A-Za-z\s.'-]+$/.test(emName)) errs.emergencyContactName = "Use letters and spaces only";

    if (!form.emergencyContactRelation) errs.emergencyContactRelation = "Select a relation";

    const emPhone = form.emergencyContactPhone.replace(/\D/g, "");
    if (!emPhone) errs.emergencyContactPhone = "Emergency phone is required";
    else if (!/^\d{10}$/.test(emPhone)) errs.emergencyContactPhone = "Must be exactly 10 digits";
    else if (emPhone === phoneDigits) errs.emergencyContactPhone = "Must differ from your own number";

    setFieldErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length) {
      toast.error("Please fix the highlighted fields");
      setAnnouncement(`${keys.length} field${keys.length > 1 ? "s" : ""} need attention. ${errs[keys[0]]}`);
      setTimeout(() => focusField(keys[0]), 50);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateContact()) return;
    setLoading(true);
    try {
      // Server-side emergency contact validation
      const { data: srv, error: srvErr } = await supabase.functions.invoke("validate-emergency-contact", {
        body: {
          name: form.emergencyContactName,
          relation: form.emergencyContactRelation,
          phone: form.emergencyContactPhone,
          ownPhone: form.phone,
        },
      });
      if (srvErr) {
        toast.error("Could not validate emergency contact. Please retry.");
        setLoading(false);
        return;
      }
      if (srv && !srv.ok) {
        const mapped: Record<string, string> = {};
        if (srv.errors?.name) mapped.emergencyContactName = srv.errors.name;
        if (srv.errors?.relation) mapped.emergencyContactRelation = srv.errors.relation;
        if (srv.errors?.phone) mapped.emergencyContactPhone = srv.errors.phone;
        setFieldErrors(prev => ({ ...prev, ...mapped }));
        toast.error("Emergency contact validation failed");
        setStep(3);
        const firstKey = Object.keys(mapped)[0];
        setAnnouncement(`Server validation: ${mapped[firstKey]}`);
        setTimeout(() => focusField(firstKey), 80);
        setLoading(false);
        return;
      }

      const aDigits = form.aadhaar.replace(/\D/g, "");
      const uucms = form.uucmsId.trim();

      // Pre-flight duplicate check
      const { data: dup, error: dupErr } = await supabase.rpc("check_registration_duplicates", {
        _email: form.email, _uucms: uucms, _aadhaar: aDigits,
      });
      if (dupErr) { toast.error("Could not verify your details. Please retry."); setLoading(false); return; }
      const d = dup as any;
      if (d?.email_taken) { toast.error("An account with this email already exists"); setStep(1); setLoading(false); return; }
      if (d?.uucms_taken) { toast.error("This UUCMS ID is already registered"); setStep(2); setLoading(false); return; }
      if (d?.aadhaar_taken) { toast.error("This Aadhaar number is already registered"); setStep(1); setLoading(false); return; }

      const { error } = await signUp(form.email, form.password, form.fullName, "student", {
        uucms_id: uucms,
        aadhaar_number: aDigits,
      });
      if (error) {
        const m = error.message || "";
        if (/already.*registered|exists/i.test(m)) toast.error("An account with this email already exists");
        else toast.error(m);
        setLoading(false); return;
      }

      await new Promise(r => setTimeout(r, 2200));
      const { data: { session } } = await supabase.auth.getSession();
      const updateData: any = {
        phone: form.phone,
        father_name: form.fatherName || "",
        mother_name: form.motherName || "",
        parent_phone: form.parentPhone || "",
        address: form.address || "",
        date_of_birth: form.dateOfBirth || null,
        gender: form.gender || "",
        blood_group: form.bloodGroup || "",
        nationality: form.nationality || "",
        previous_school: form.previousSchool || "",
        emergency_contact_name: form.emergencyContactName || "",
        emergency_contact_phone: form.emergencyContactPhone || "",
        emergency_contact_relation: form.emergencyContactRelation || "",
        ...(form.courseId ? { course_id: form.courseId } : {}),
        fee_remarks: `Prev: ${form.previousQualification} • ${form.previousPercentage}`,
      };
      if (session?.user) {
        await supabase.from("profiles").update({ phone: form.phone }).eq("user_id", session.user.id);
        await supabase.from("students").update(updateData).eq("user_id", session.user.id);
        await uploadPendingPhoto(session.user.id);
      } else {
        localStorage.setItem("hdc_pending_student_info", JSON.stringify(form));
      }
      await clearDraft();
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };


  const handleAutoLogin = async () => {
    setSigningIn(true);
    try {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        if (/confirm|verify/i.test(error.message)) {
          toast.message("Please verify your email first", { description: "Tap 'Resend verification email' below if you didn't receive it." });
        } else {
          toast.error(error.message);
        }
        setSigningIn(false);
        return;
      }
      const { data: { user: justSignedIn } } = await supabase.auth.getUser();
      if (justSignedIn && pendingPhoto) await uploadPendingPhoto(justSignedIn.id);

      localStorage.setItem("hdc_show_perms", "1");
      localStorage.setItem("hdc_remember", "1");
      sessionStorage.setItem("hdc_remember", "1");
      toast.success("Welcome to HDC Portal!");
      setTimeout(() => navigate("/dashboard"), 400);
    } catch (e: any) {
      toast.error(e.message || "Sign-in failed");
      setSigningIn(false);
    }
  };

  const inputClass = (name: string) =>
    `w-full bg-transparent border ${focused === name ? "border-secondary/60 shadow-[0_0_15px_rgba(212,175,55,0.15)]" : "border-border/30"} rounded-xl px-4 py-3 pl-11 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-300`;

  const iconClass = (name: string) =>
    `absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 pointer-events-none ${focused === name ? "text-secondary scale-110" : "text-muted-foreground/40"}`;

  const stepLabels = ["Personal Details", "Academic Background", "Contact Information", "Review & Confirm"];

  const errorId = (k: string) => `err-${k}`;
  const errorText = (k: string) =>
    fieldErrors[k] ? (
      <p id={errorId(k)} role="alert" className="font-body text-[11px] text-rose-400 mt-1 ml-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" aria-hidden="true" /> {fieldErrors[k]}
      </p>
    ) : null;
  const ariaErrorProps = (k: string) => fieldErrors[k] ? { "aria-invalid": true as const, "aria-describedby": errorId(k) } : {};


  const fieldBorder = (k: string) => fieldErrors[k] ? "border-rose-500/60" : "";

  // ============= PREMIUM SUCCESS SCREEN =============
  if (success) {
    return (
      <>
        <SEOHead title="Welcome to HDC Portal" description="Your account has been created" />
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
          style={{ background: "radial-gradient(ellipse at top, hsl(45 40% 12%) 0%, hsl(222 47% 6%) 40%, hsl(222 50% 3%) 100%)" }}>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="absolute rounded-full"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 53) % 100}%`,
                  width: `${4 + (i % 4) * 2}px`,
                  height: `${4 + (i % 4) * 2}px`,
                  background: i % 3 === 0 ? "hsl(45 90% 65% / 0.6)" : i % 3 === 1 ? "hsl(280 80% 70% / 0.4)" : "hsl(200 80% 70% / 0.4)",
                  filter: "blur(1px)",
                  animation: `particleFloat ${8 + (i % 5) * 2}s ease-in-out ${i * 0.2}s infinite`,
                }} />
            ))}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, hsl(45 90% 60%), transparent 70%)", animation: "glowPulse 5s ease-in-out infinite" }} />
          </div>

          <div className="relative max-w-md w-full text-center" style={{ animation: "successEnter 1s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div className="relative w-44 h-44 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border border-amber-400/20" style={{ animation: "ringSpin 22s linear infinite" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-amber-400" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 rounded-full bg-amber-300" />
              </div>
              <div className="absolute inset-4 rounded-full border border-amber-400/30" style={{ animation: "ringSpin 18s linear infinite reverse" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-200" />
              </div>
              <div className="absolute inset-7 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(45 90% 60% / 0.18), transparent 70%)", animation: "glowPulse 2.4s ease-in-out infinite" }} />
              <div className="absolute inset-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(45 90% 55%), hsl(35 95% 60%), hsl(30 90% 50%))",
                  boxShadow: "0 20px 60px -10px hsl(45 90% 55% / 0.6), inset 0 2px 0 rgba(255,255,255,0.3)",
                  animation: "checkIn 0.8s 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                }}>
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-background" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "drawCheck 0.6s 1s ease-out forwards" }} />
                </svg>
              </div>
            </div>

            <div style={{ animation: "fadeUp 0.7s 0.6s both" }}>
              <p className="font-body text-xs uppercase tracking-[0.3em] text-amber-400/80 mb-3 font-semibold">
                <Sparkles className="w-3 h-3 inline mr-1.5 -mt-0.5" />
                Welcome to Hoysala
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
                You're <span style={{ background: "linear-gradient(135deg, hsl(45 90% 65%), hsl(35 95% 60%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>All Set</span>
              </h1>
              <p className="font-body text-base text-white/60 leading-relaxed mb-2 px-4">
                Your account has been created successfully.
              </p>
              <p className="font-body text-sm text-white/40 mb-8">
                Hello, <span className="text-amber-300/90 font-semibold">{form.fullName}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 p-5 mb-6 text-left"
              style={{ background: "linear-gradient(135deg, hsl(222 30% 12% / 0.7), hsl(222 30% 8% / 0.7))", backdropFilter: "blur(20px)", animation: "fadeUp 0.7s 0.8s both" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[10px] uppercase tracking-wider text-white/40">Registered email</p>
                  <p className="font-body text-sm text-white truncate">{form.email}</p>
                </div>
              </div>
              <p className="font-body text-[11px] text-white/40 leading-relaxed">
                A verification link has been sent. After verifying, your registration goes to the administration for approval — you'll get full dashboard access once it's approved.
              </p>

            </div>

            <div style={{ animation: "fadeUp 0.7s 1s both" }}>
              <Button onClick={handleAutoLogin} disabled={signingIn}
                className="w-full h-14 rounded-2xl font-body font-semibold text-base relative overflow-hidden group"
                style={{ background: "linear-gradient(135deg, hsl(45 90% 50%), hsl(35 95% 55%), hsl(30 90% 50%))", boxShadow: "0 20px 50px -10px hsl(45 90% 55% / 0.5)" }}>
                <span className="relative z-10 text-background flex items-center justify-center gap-2.5">
                  {signingIn ? (
                    <><div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Signing you in...</>
                  ) : (
                    <>Login to Dashboard <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Button>

              <button onClick={handleResendVerification} disabled={resending}
                className="mt-4 w-full font-body text-xs text-amber-300/70 hover:text-amber-200 transition-colors inline-flex items-center justify-center gap-1.5 py-2 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending verification email..." : "Resend verification email"}
              </button>

              <button onClick={() => navigate("/login")}
                className="mt-1 font-body text-xs text-white/40 hover:text-white/70 transition-colors inline-flex items-center gap-1">
                Or sign in manually <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <style>{`
            @keyframes successEnter { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes checkIn { 0% { transform: scale(0) rotate(-180deg); } 60% { transform: scale(1.15) rotate(10deg); } 100% { transform: scale(1) rotate(0); } }
            @keyframes drawCheck { to { stroke-dashoffset: 0; } }
            @keyframes ringSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes glowPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.08); } }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes particleFloat { 0%, 100% { transform: translate(0, 0); opacity: 0.3; } 50% { transform: translate(20px, -30px); opacity: 0.8; } }
          `}</style>
        </div>
      </>
    );
  }

  // ============= REGISTRATION FORM =============
  return (
    <>
      <SEOHead title="Student Registration | Hoysala Degree College" description="Register as a student at Hoysala Degree College portal" />
      <div className="min-h-screen flex items-center justify-center p-4 py-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(222 47% 8%) 0%, hsl(222 47% 5%) 50%, hsl(222 47% 10%) 100%)" }}>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, hsl(45 80% 55%), transparent 70%)", animation: "float 18s ease-in-out infinite" }} />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full opacity-[0.03]"
            style={{ background: "radial-gradient(circle, hsl(45 80% 55%), transparent 70%)", animation: "float 22s ease-in-out infinite reverse" }} />
        </div>

        <div ref={cardRef} onMouseMove={handleMouseMove}
          className="relative w-full max-w-lg rounded-[24px] border border-border/20 p-6 sm:p-8 overflow-hidden animate-scale-in"
          style={{
            background: "linear-gradient(135deg, hsl(222 30% 12% / 0.95), hsl(222 30% 9% / 0.98))",
            backdropFilter: "blur(60px)",
            boxShadow: "0 25px 80px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>

          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{ background: `radial-gradient(400px circle at ${mousePos.x}% ${mousePos.y}%, hsl(45 80% 55% / 0.06), transparent 60%)` }} />

          <div className="text-center mb-6 relative z-10">
            <img src={collegeLogo} alt="Hoysala Degree College" className="w-14 h-14 mx-auto mb-3 rounded-2xl shadow-lg" />
            <h1 ref={stepHeadingRef} tabIndex={-1} className="font-display text-xl font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 rounded">Student Registration</h1>
            <p className="font-body text-xs text-muted-foreground/60 mt-1">Four quick sections to set up your student profile</p>
            {draftRestored && (
              <p className="font-body text-[10px] text-emerald-400/80 mt-1.5">Draft restored — your previous entries are loaded.</p>
            )}

            <nav aria-label="Registration progress" role="navigation" className="mt-5">
              <div className="relative max-w-[300px] mx-auto">
                {/* Animated background track */}
                <div aria-hidden="true" className="absolute top-1/2 left-3 right-3 h-[3px] -translate-y-1/2 rounded-full bg-border/15 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      width: `${((step - 1) / 3) * 100}%`,
                      background: "linear-gradient(90deg, hsl(45 80% 50%), hsl(45 90% 65%), hsl(40 85% 55%))",
                      boxShadow: "0 0 12px hsl(45 80% 55% / 0.5)",
                    }}
                  />
                </div>
                <ol className="relative flex items-center justify-between list-none p-0 m-0">
                  {[1, 2, 3, 4].map(s => {
                    const reachable = s <= step;
                    const isDone = step > s;
                    const isCurrent = step === s;
                    return (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => reachable && setStep(s)}
                          disabled={!reachable}
                          aria-current={isCurrent ? "step" : undefined}
                          aria-label={`Step ${s}: ${stepLabels[s-1]}${isDone ? " (completed)" : isCurrent ? " (current)" : " (upcoming)"}`}
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center font-body text-[11px] font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${
                            isDone
                              ? "bg-secondary text-background border border-secondary shadow-[0_4px_14px_-2px_hsl(45_80%_55%_/_0.6)]"
                              : isCurrent
                              ? "bg-secondary/15 text-secondary border border-secondary/60 scale-110 shadow-[0_0_0_4px_hsl(45_80%_55%_/_0.12)]"
                              : "bg-card/60 text-muted-foreground/40 border border-border/30 backdrop-blur-sm"
                          } ${reachable && !isCurrent ? "hover:scale-105 cursor-pointer" : ""} ${!reachable ? "cursor-not-allowed" : ""}`}
                        >
                          {isCurrent && (
                            <span aria-hidden="true" className="absolute inset-0 rounded-full animate-ping bg-secondary/30" style={{ animationDuration: "2.4s" }} />
                          )}
                          {isDone ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : s}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </nav>
            <p key={step} className="font-body text-[11px] text-secondary/80 mt-3 uppercase tracking-widest font-semibold animate-fade-in">
              Step {step} of 4 — {stepLabels[step - 1]}
            </p>
          </div>

          {/* Screen-reader live region for step/error announcements */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>



          {/* ============ STEP 1: PERSONAL DETAILS ============ */}
          {step === 1 && (
            <form noValidate onSubmit={(e) => { e.preventDefault(); if (validatePersonal()) setStep(2); }} className="space-y-3.5 relative z-10 animate-fade-in">

              {/* Photo upload */}
              <div className="flex flex-col items-center mb-1">
                <label className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-secondary/30 bg-muted/10 flex items-center justify-center cursor-pointer hover:border-secondary/60 transition-colors group">
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="w-6 h-6 text-muted-foreground/60" />
                      <span className="font-body text-[9px] text-muted-foreground/60 uppercase tracking-wider">Photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
                  {photoPreview && (
                    <button type="button" onClick={(e) => { e.preventDefault(); clearPhoto(); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 text-white flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </label>
                <p className="font-body text-[10px] text-muted-foreground/50 mt-2 text-center">
                  Optional · JPG / PNG / WebP · max 5 MB
                </p>
                {photoError && (
                  <p className="font-body text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {photoError}
                  </p>
                )}
                {pendingPhoto && !photoError && (
                  <p className="font-body text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3" /> {pendingPhoto.name} · {(pendingPhoto.size / 1024).toFixed(0)} KB ready
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <User className={iconClass("fullName")} />
                  <input ref={registerFieldRef("fullName")} type="text" placeholder="Full Name (as per official records) *" aria-label="Full Name (as per official records)" {...ariaErrorProps("fullName")} value={form.fullName}
                    onChange={e => setF("fullName", e.target.value)} onFocus={() => setFocused("fullName")} onBlur={() => setFocused(null)}
                    className={`${inputClass("fullName")} ${fieldBorder("fullName")}`} />
                </div>
                {errorText("fullName")}
              </div>
              <div>
                <div className="relative">
                  <Mail className={iconClass("email")} />
                  <input ref={registerFieldRef("email")} type="email" placeholder="Email Address *" aria-label="Email Address" {...ariaErrorProps("email")} value={form.email}
                    onChange={e => setF("email", e.target.value)} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                    className={`${inputClass("email")} ${fieldBorder("email")}`} />
                </div>
                {errorText("email")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="relative">
                    <Lock className={iconClass("password")} />
                    <input ref={registerFieldRef("password")} type={showPassword ? "text" : "password"} placeholder="Password *" aria-label="Password" {...ariaErrorProps("password")} value={form.password}
                      onChange={e => setF("password", e.target.value)} onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                      className={`${inputClass("password")} ${fieldBorder("password")}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-secondary/60">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errorText("password")}
                </div>
                <div>
                  <div className="relative">
                    <Lock className={iconClass("confirmPassword")} />
                    <input ref={registerFieldRef("confirmPassword")} type={showPassword ? "text" : "password"} placeholder="Confirm *" aria-label="Confirm" {...ariaErrorProps("confirmPassword")} value={form.confirmPassword}
                      onChange={e => setF("confirmPassword", e.target.value)} onFocus={() => setFocused("confirmPassword")} onBlur={() => setFocused(null)}
                      className={`${inputClass("confirmPassword")} ${fieldBorder("confirmPassword")}`} />
                  </div>
                  {errorText("confirmPassword")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="relative">
                    <Calendar className={iconClass("dob")} />
                    <input ref={registerFieldRef("dateOfBirth")} type="date" value={form.dateOfBirth} max={new Date().toISOString().split("T")[0]} {...ariaErrorProps("dateOfBirth")}
                      onChange={e => setF("dateOfBirth", e.target.value)} onFocus={() => setFocused("dob")} onBlur={() => setFocused(null)}
                      className={`${inputClass("dob")} ${fieldBorder("dateOfBirth")} ${!form.dateOfBirth ? "text-muted-foreground/50" : ""}`} />
                  </div>
                  {errorText("dateOfBirth")}
                </div>
                <div>
                  <PremiumSelect
                    value={form.gender}
                    onValueChange={v => { set("gender", v); clearErr("gender"); }}
                    onOpenChange={o => setFocused(o ? "gender" : null)}
                    focused={focused === "gender"}
                    triggerRef={(el) => registerFieldRef("gender")(el as unknown as HTMLElement)}
                    invalid={!!fieldErrors.gender}
                    ariaDescribedBy={fieldErrors.gender ? errorId("gender") : undefined}
                    placeholder="Gender *"
                    ariaLabel="Gender"
                    icon={<UserCheck className={iconClass("gender")} />}
                    options={GENDERS.map(g => ({ value: g, label: g }))}
                  />
                  {errorText("gender")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <PremiumSelect
                  value={form.bloodGroup}
                  onValueChange={v => set("bloodGroup", v)}
                  onOpenChange={o => setFocused(o ? "blood" : null)}
                  focused={focused === "blood"}
                  placeholder="Blood Group"
                  ariaLabel="Blood Group"
                  icon={<Droplet className={iconClass("blood")} />}
                  options={BLOOD_GROUPS.map(b => ({ value: b, label: b }))}
                />
                <div className="relative">
                  <Flag className={iconClass("nat")} />
                  <input type="text" placeholder="Nationality" aria-label="Nationality" value={form.nationality}
                    onChange={e => set("nationality", e.target.value)} onFocus={() => setFocused("nat")} onBlur={() => setFocused(null)}
                    className={inputClass("nat")} />
                </div>
              </div>

              <div>
                <div className="relative">
                  <ShieldAlert className={iconClass("aadhaar")} />
                  <input ref={registerFieldRef("aadhaar")} type="text" inputMode="numeric" maxLength={14} placeholder="Aadhaar Number (12 digits) *" aria-label="Aadhaar Number (12 digits)" {...ariaErrorProps("aadhaar")} value={form.aadhaar}
                    onChange={e => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 12);
                      const formatted = d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
                      setF("aadhaar", formatted);
                    }}
                  onFocus={() => setFocused("aadhaar")} onBlur={() => setFocused(null)}
                  className={`${inputClass("aadhaar")} ${fieldBorder("aadhaar")}`} />
                </div>
                {errorText("aadhaar")}
              </div>



              <Button type="submit"
                className="w-full h-[52px] rounded-2xl font-body font-semibold text-[15px] relative overflow-hidden group mt-2 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)] hover:shadow-[0_14px_40px_-10px_rgba(212,175,55,0.65)] active:scale-[0.98] transition-all duration-300 border-0"
                style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(45 80% 55%), hsl(40 85% 50%))" }}>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                <span className="relative z-10 text-background flex items-center justify-center gap-2 tracking-tight">
                  Continue to Academic Background <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Button>
            </form>

          )}

          {/* ============ STEP 2: ACADEMIC BACKGROUND ============ */}
          {step === 2 && (
            <form noValidate onSubmit={(e) => { e.preventDefault(); if (validateAcademic()) setStep(3); }} className="space-y-3.5 relative z-10 animate-fade-in">

              <div className="relative">
                <Sparkles className={iconClass("uucms")} />
                <input type="text" placeholder="UUCMS ID (University-issued) *" aria-label="UUCMS ID (University-issued)" value={form.uucmsId}
                  onChange={e => set("uucmsId", e.target.value.toUpperCase().trim())}
                  onFocus={() => setFocused("uucms")} onBlur={() => setFocused(null)}
                  className={inputClass("uucms")} />
              </div>
              <p className="font-body text-[10px] text-muted-foreground/50 -mt-2 ml-1">
                Enter the exact UUCMS ID assigned by the university — required to verify your enrollment.
              </p>
              <PremiumSelect
                value={form.courseId}
                onValueChange={v => set("courseId", v)}
                onOpenChange={o => setFocused(o ? "course" : null)}
                focused={focused === "course"}
                required
                placeholder="Course of Interest *"
                ariaLabel="Course of Interest"
                icon={<BookOpen className={iconClass("course")} />}
                options={courses.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              />

              <PremiumSelect
                value={form.previousQualification}
                onValueChange={v => set("previousQualification", v)}
                onOpenChange={o => setFocused(o ? "qual" : null)}
                focused={focused === "qual"}
                required
                placeholder="Previous Qualification (12th / Equivalent) *"
                ariaLabel="Previous Qualification"
                icon={<GraduationCap className={iconClass("qual")} />}
                options={QUALIFICATIONS.map(q => ({ value: q, label: q }))}
              />

              <PremiumSelect
                value={form.previousPercentage}
                onValueChange={v => set("previousPercentage", v)}
                onOpenChange={o => setFocused(o ? "perc" : null)}
                focused={focused === "perc"}
                required
                placeholder="Previous Score Range *"
                ariaLabel="Previous Score Range"
                icon={<Award className={iconClass("perc")} />}
                options={PERCENTAGE_RANGES.map(p => ({ value: p, label: p }))}
              />
              <div className="relative">
                <School className={iconClass("school")} />
                <input type="text" placeholder="Previous School / PU College Name *" aria-label="Previous School / PU College Name" value={form.previousSchool}
                  onChange={e => set("previousSchool", e.target.value)} onFocus={() => setFocused("school")} onBlur={() => setFocused(null)}
                  className={inputClass("school")} />
              </div>

              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                <p className="font-body text-[11px] text-amber-300/80 leading-relaxed">
                  <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />
                  Your roll number and admission year will be auto-assigned after registration.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setStep(1)}
                  className="flex-1 h-[52px] rounded-2xl font-body text-[14px] border-border/40 bg-transparent text-muted-foreground hover:bg-muted/15 hover:text-foreground active:scale-[0.98] transition-all duration-300">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button type="submit"
                  className="flex-[2] h-[52px] rounded-2xl font-body font-semibold text-[15px] relative overflow-hidden group shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)] hover:shadow-[0_14px_40px_-10px_rgba(212,175,55,0.65)] active:scale-[0.98] transition-all duration-300 border-0"
                  style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(45 80% 55%), hsl(40 85% 50%))" }}>
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  <span className="relative z-10 text-background flex items-center justify-center gap-2 tracking-tight">
                    Continue to Contact <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Button>
              </div>
            </form>
          )}


          {/* ============ STEP 3: CONTACT INFORMATION ============ */}
          {step === 3 && (
            <form noValidate onSubmit={(e) => { e.preventDefault(); if (validateContact()) setStep(4); }} className="space-y-3.5 relative z-10 animate-fade-in">

              <div>
                <div className="relative">
                  <Phone className={iconClass("phone")} />
                  <input ref={registerFieldRef("phone")} type="tel" inputMode="numeric" maxLength={10} placeholder="Mobile Number (10 digits) *" aria-label="Mobile Number (10 digits)" {...ariaErrorProps("phone")} value={form.phone}
                    onChange={e => { set("phone", e.target.value.replace(/\D/g, "")); if (fieldErrors.phone) setFieldErrors(p => { const n = { ...p }; delete n.phone; return n; }); }}
                    onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
                    className={`${inputClass("phone")} ${fieldBorder("phone")}`} />
                </div>
                {errorText("phone")}
              </div>
              <div>
                <div className="relative">
                  <MapPin className={iconClass("address")} />
                  <textarea ref={registerFieldRef("address")} placeholder="Residential Address (street, city, state, PIN) *" aria-label="Residential Address (street, city, state, PIN)" {...ariaErrorProps("address")} value={form.address} rows={2}
                    onChange={e => { set("address", e.target.value); if (fieldErrors.address) setFieldErrors(p => { const n = { ...p }; delete n.address; return n; }); }}
                    onFocus={() => setFocused("address")} onBlur={() => setFocused(null)}
                    className={`${inputClass("address")} ${fieldBorder("address")} resize-none pt-3`} />

                </div>
                {errorText("address")}
              </div>

              <div className="rounded-xl border border-border/20 bg-white/[0.02] p-3 space-y-3">
                <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
                  <Heart className="w-3 h-3" /> Parent / Guardian
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Users className={iconClass("father")} />
                    <input type="text" placeholder="Father's Name" aria-label="Father's Name" value={form.fatherName}
                      onChange={e => set("fatherName", e.target.value)} onFocus={() => setFocused("father")} onBlur={() => setFocused(null)}
                      className={inputClass("father")} />
                  </div>
                  <div className="relative">
                    <Users className={iconClass("mother")} />
                    <input type="text" placeholder="Mother's Name" aria-label="Mother's Name" value={form.motherName}
                      onChange={e => set("motherName", e.target.value)} onFocus={() => setFocused("mother")} onBlur={() => setFocused(null)}
                      className={inputClass("mother")} />
                  </div>
                </div>
                <div className="relative">
                  <Phone className={iconClass("parentPhone")} />
                  <input type="tel" inputMode="numeric" maxLength={10} placeholder="Parent's Phone Number" aria-label="Parent's Phone Number" value={form.parentPhone}
                    onChange={e => set("parentPhone", e.target.value.replace(/\D/g, ""))} onFocus={() => setFocused("parentPhone")} onBlur={() => setFocused(null)}
                    className={inputClass("parentPhone")} />
                </div>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3 space-y-3">
                <p className="font-body text-[10px] uppercase tracking-widest text-rose-300/80 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3" /> Emergency Contact (Required)
                </p>
                <div>
                  <div className="relative">
                    <User className={iconClass("emName")} />
                    <input ref={registerFieldRef("emergencyContactName")} type="text" placeholder="Emergency Contact Name *" aria-label="Emergency Contact Name" {...ariaErrorProps("emergencyContactName")} value={form.emergencyContactName}
                      onChange={e => { set("emergencyContactName", e.target.value); if (fieldErrors.emergencyContactName) setFieldErrors(p => { const n = { ...p }; delete n.emergencyContactName; return n; }); }}
                      onFocus={() => setFocused("emName")} onBlur={() => setFocused(null)}
                      className={`${inputClass("emName")} ${fieldBorder("emergencyContactName")}`} />
                  </div>
                  {errorText("emergencyContactName")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <PremiumSelect
                      value={form.emergencyContactRelation}
                      onValueChange={v => { set("emergencyContactRelation", v); if (fieldErrors.emergencyContactRelation) setFieldErrors(p => { const n = { ...p }; delete n.emergencyContactRelation; return n; }); }}
                      onOpenChange={o => setFocused(o ? "emRel" : null)}
                      focused={focused === "emRel"}
                      triggerRef={(el) => registerFieldRef("emergencyContactRelation")(el as unknown as HTMLElement)}
                      invalid={!!fieldErrors.emergencyContactRelation}
                      ariaDescribedBy={fieldErrors.emergencyContactRelation ? errorId("emergencyContactRelation") : undefined}
                      placeholder="Relation *"
                      ariaLabel="Emergency contact relation"
                      icon={<UserCheck className={iconClass("emRel")} />}
                      options={RELATIONS.map(r => ({ value: r, label: r }))}
                    />
                    {errorText("emergencyContactRelation")}
                  </div>
                  <div>
                    <div className="relative">
                      <Phone className={iconClass("emPh")} />
                      <input ref={registerFieldRef("emergencyContactPhone")} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit Phone *" aria-label="Emergency contact 10-digit phone" {...ariaErrorProps("emergencyContactPhone")} value={form.emergencyContactPhone}
                        onChange={e => { set("emergencyContactPhone", e.target.value.replace(/\D/g, "")); if (fieldErrors.emergencyContactPhone) setFieldErrors(p => { const n = { ...p }; delete n.emergencyContactPhone; return n; }); }}
                        onFocus={() => setFocused("emPh")} onBlur={() => setFocused(null)}
                        className={`${inputClass("emPh")} ${fieldBorder("emergencyContactPhone")}`} />

                    </div>
                    {errorText("emergencyContactPhone")}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setStep(2)}
                  className="flex-1 h-[52px] rounded-2xl font-body text-[14px] border-border/40 bg-transparent text-muted-foreground hover:bg-muted/15 hover:text-foreground active:scale-[0.98] transition-all duration-300">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button type="submit"
                  className="flex-[2] h-[52px] rounded-2xl font-body font-semibold text-[15px] relative overflow-hidden group shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)] hover:shadow-[0_14px_40px_-10px_rgba(212,175,55,0.65)] active:scale-[0.98] transition-all duration-300 border-0"
                  style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(45 80% 55%), hsl(40 85% 50%))" }}>
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  <span className="relative z-10 text-background flex items-center justify-center gap-2 tracking-tight">
                    Continue to Review <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Button>
              </div>
            </form>
          )}


          {/* ============ STEP 4: REVIEW & CONFIRM ============ */}
          {step === 4 && (() => {
            const selectedCourse = courses.find(c => c.id === form.courseId);
            const Row = ({ label, value }: { label: string; value?: string | null }) => (
              <div className="flex items-start justify-between gap-3 py-1.5">
                <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground/60 shrink-0">{label}</span>
                <span className="font-body text-xs text-foreground text-right break-words">{value && value.toString().trim() ? value : <span className="text-muted-foreground/40 italic">—</span>}</span>
              </div>
            );
            const Section = ({ title, icon: Icon, onEdit, children }: any) => (
              <div className="rounded-xl border border-border/20 bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-body text-[10px] uppercase tracking-widest text-secondary/80 font-semibold flex items-center gap-1.5">
                    <Icon className="w-3 h-3" /> {title}
                  </p>
                  <button type="button" onClick={onEdit}
                    className="font-body text-[10px] text-secondary/70 hover:text-secondary inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/10 transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="divide-y divide-border/10">{children}</div>
              </div>
            );
            return (
              <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 flex items-start gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <p className="font-body text-[11px] text-amber-200/90 leading-relaxed">
                    Please review your details carefully. After confirming, your account will be created and a verification email sent.
                  </p>
                </div>

                <Section title="Personal Details" icon={User} onEdit={() => setStep(1)}>
                  {photoPreview && (
                    <div className="flex justify-center pb-2">
                      <img src={photoPreview} alt="profile" className="w-16 h-16 rounded-full object-cover border border-secondary/30" />
                    </div>
                  )}
                  <Row label="Full Name" value={form.fullName} />
                  <Row label="Email" value={form.email} />
                  <Row label="Date of Birth" value={form.dateOfBirth} />
                  <Row label="Gender" value={form.gender} />
                  <Row label="Blood Group" value={form.bloodGroup} />
                  <Row label="Nationality" value={form.nationality} />
                  <Row label="Aadhaar" value={form.aadhaar} />

                </Section>

                <Section title="Academic Background" icon={GraduationCap} onEdit={() => setStep(2)}>
                  <Row label="UUCMS ID" value={form.uucmsId} />

                  <Row label="Course" value={selectedCourse ? `${selectedCourse.name} (${selectedCourse.code})` : ""} />
                  <Row label="Qualification" value={form.previousQualification} />
                  <Row label="Score Range" value={form.previousPercentage} />
                  <Row label="Previous School" value={form.previousSchool} />
                </Section>

                <Section title="Contact" icon={Phone} onEdit={() => setStep(3)}>
                  <Row label="Mobile" value={form.phone} />
                  <Row label="Address" value={form.address} />
                  <Row label="Father" value={form.fatherName} />
                  <Row label="Mother" value={form.motherName} />
                  <Row label="Parent Phone" value={form.parentPhone} />
                </Section>

                <Section title="Emergency Contact" icon={ShieldAlert} onEdit={() => setStep(3)}>
                  <Row label="Name" value={form.emergencyContactName} />
                  <Row label="Relation" value={form.emergencyContactRelation} />
                  <Row label="Phone" value={form.emergencyContactPhone} />
                </Section>

                {pendingPhoto && uploadProgress !== null && (
                  <div className="rounded-xl border border-secondary/20 bg-secondary/[0.04] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-body text-[11px] text-secondary/90 flex items-center gap-1.5">
                        <Camera className="w-3 h-3" /> Uploading profile photo
                      </span>
                      <span className="font-body text-[11px] text-secondary font-semibold tabular-nums">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border/20 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg, hsl(45 80% 50%), hsl(35 90% 55%))" }} />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setStep(3)} disabled={loading}
                    className="flex-1 h-[52px] rounded-2xl font-body text-[14px] border-border/40 bg-transparent text-muted-foreground hover:bg-muted/15 hover:text-foreground active:scale-[0.98] transition-all duration-300">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <Button type="submit" disabled={loading}
                    className="flex-[2] h-[52px] rounded-2xl font-body font-semibold text-[15px] relative overflow-hidden group disabled:opacity-50 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)] hover:shadow-[0_14px_40px_-10px_rgba(212,175,55,0.65)] active:scale-[0.98] transition-all duration-300 border-0"
                    style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(45 80% 55%), hsl(40 85% 50%))" }}>
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    <span className="relative z-10 text-background flex items-center justify-center gap-2 tracking-tight">
                      {loading ? (
                        <><div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Creating Account...</>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /> Confirm & Create Account</>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </Button>
                </div>
              </form>
            );
          })()}

          <div className="text-center mt-5 relative z-10 space-y-2">
            <p className="font-body text-xs text-muted-foreground/40">
              Already have an account?{" "}
              <Link to="/login" className="text-secondary/70 hover:text-secondary transition-colors font-semibold">Sign In</Link>
            </p>
            <Link to="/" className="inline-flex items-center gap-1.5 font-body text-[11px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Website
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>
    </>
  );
}
