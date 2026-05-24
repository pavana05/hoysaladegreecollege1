import { useState, useRef, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, Phone, MapPin, Calendar, Users, GraduationCap, Sparkles, CheckCircle, BookOpen, Award, ChevronRight, ArrowRight, Camera, X, RefreshCw } from "lucide-react";
import collegeLogo from "@/assets/college-logo.png";
import { Button } from "@/components/ui/button";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    phone: "", dateOfBirth: "", fatherName: "", motherName: "",
    parentPhone: "", address: "",
    courseId: "", previousQualification: "", previousPercentage: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from("courses").select("id, name, code").eq("is_active", true).order("name")
      .then(({ data }) => setCourses(data || []));
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5 MB"); return; }
    setPendingPhoto(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const clearPhoto = () => { setPendingPhoto(null); setPhotoPreview(null); };

  const uploadPendingPhoto = async (userId: string) => {
    if (!pendingPhoto) return null;
    try {
      const ext = pendingPhoto.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, pendingPhoto, { upsert: true, contentType: pendingPhoto.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", userId);
      await supabase.from("students").update({ avatar_url: pub.publicUrl }).eq("user_id", userId);
      return pub.publicUrl;
    } catch (e) {
      console.error("photo upload failed", e);
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

  const validateStep1 = () => {
    if (!form.fullName.trim()) { toast.error("Please enter your full name"); return false; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { toast.error("Please enter a valid email"); return false; }
    if (!form.password || form.password.length < 6) { toast.error("Password must be at least 6 characters"); return false; }
    if (form.password !== form.confirmPassword) { toast.error("Passwords don't match"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.phone.trim()) { toast.error("Phone number is required"); return false; }
    if (!form.address.trim()) { toast.error("Address is required"); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!form.courseId) { toast.error("Please select your course of interest"); return false; }
    if (!form.previousQualification) { toast.error("Please select your previous qualification"); return false; }
    if (!form.previousPercentage) { toast.error("Please select your previous score range"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
    setLoading(true);
    try {
      const { error } = await signUp(form.email, form.password, form.fullName, "student");
      if (error) { toast.error(error.message); setLoading(false); return; }

      await new Promise(r => setTimeout(r, 2200));
      const { data: { session } } = await supabase.auth.getSession();
      const academic = `${form.previousQualification}${form.previousPercentage ? ` • ${form.previousPercentage}` : ""}`.trim();
      const updateData: any = {
        phone: form.phone,
        father_name: form.fatherName || "",
        mother_name: form.motherName || "",
        parent_phone: form.parentPhone || "",
        address: form.address || "",
        date_of_birth: form.dateOfBirth || null,
        ...(form.courseId ? { course_id: form.courseId } : {}),
        ...(academic ? { fee_remarks: `Prev: ${academic}` } : {}),
      };
      if (session?.user) {
        await supabase.from("profiles").update({ phone: form.phone }).eq("user_id", session.user.id);
        await supabase.from("students").update(updateData).eq("user_id", session.user.id);
        await uploadPendingPhoto(session.user.id);
      } else {
        localStorage.setItem("hdc_pending_student_info", JSON.stringify({
          phone: form.phone, dateOfBirth: form.dateOfBirth, fatherName: form.fatherName,
          motherName: form.motherName, parentPhone: form.parentPhone, address: form.address,
          courseId: form.courseId, previousQualification: form.previousQualification, previousPercentage: form.previousPercentage,
        }));
      }
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
      // Upload photo now if it wasn't uploaded earlier (no session at signup time)
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
    `absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${focused === name ? "text-secondary scale-110" : "text-muted-foreground/40"}`;

  // ============= PREMIUM SUCCESS SCREEN =============
  if (success) {
    return (
      <>
        <SEOHead title="Welcome to HDC Portal" description="Your account has been created" />
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
          style={{ background: "radial-gradient(ellipse at top, hsl(45 40% 12%) 0%, hsl(222 47% 6%) 40%, hsl(222 50% 3%) 100%)" }}>

          {/* floating particles */}
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
            {/* Ornate gold rings around check */}
            <div className="relative w-44 h-44 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border border-amber-400/20" style={{ animation: "ringSpin 22s linear infinite" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-amber-400" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 rounded-full bg-amber-300" />
              </div>
              <div className="absolute inset-4 rounded-full border border-amber-400/30" style={{ animation: "ringSpin 18s linear infinite reverse" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-200" />
              </div>
              <div className="absolute inset-7 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(45 90% 60% / 0.18), transparent 70%)",
                  animation: "glowPulse 2.4s ease-in-out infinite",
                }} />
              {/* Center check */}
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

            {/* Info card */}
            <div className="rounded-2xl border border-white/5 p-5 mb-6 text-left"
              style={{
                background: "linear-gradient(135deg, hsl(222 30% 12% / 0.7), hsl(222 30% 8% / 0.7))",
                backdropFilter: "blur(20px)",
                animation: "fadeUp 0.7s 0.8s both",
              }}>
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
                A verification link has been sent. You can sign in immediately, and we'll request access to fingerprint, location, camera, and your profile photo next.
              </p>
            </div>

            {/* CTA */}
            <div style={{ animation: "fadeUp 0.7s 1s both" }}>
              <Button onClick={handleAutoLogin} disabled={signingIn}
                className="w-full h-14 rounded-2xl font-body font-semibold text-base relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, hsl(45 90% 50%), hsl(35 95% 55%), hsl(30 90% 50%))",
                  boxShadow: "0 20px 50px -10px hsl(45 90% 55% / 0.5)",
                }}>
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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(222 47% 8%) 0%, hsl(222 47% 5%) 50%, hsl(222 47% 10%) 100%)" }}>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, hsl(45 80% 55%), transparent 70%)", animation: "float 18s ease-in-out infinite" }} />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full opacity-[0.03]"
            style={{ background: "radial-gradient(circle, hsl(45 80% 55%), transparent 70%)", animation: "float 22s ease-in-out infinite reverse" }} />
        </div>

        <div ref={cardRef} onMouseMove={handleMouseMove}
          className="relative w-full max-w-lg rounded-2xl border border-border/20 p-7 sm:p-8 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(222 30% 12% / 0.95), hsl(222 30% 9% / 0.98))",
            backdropFilter: "blur(60px)",
            boxShadow: "0 25px 80px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>

          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{ background: `radial-gradient(400px circle at ${mousePos.x}% ${mousePos.y}%, hsl(45 80% 55% / 0.06), transparent 60%)` }} />

          <div className="text-center mb-6 relative z-10">
            <img src={collegeLogo} alt="Hoysala Degree College" className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-lg" />
            <h1 className="font-display text-xl font-bold text-foreground">Student Registration</h1>
            <p className="font-body text-xs text-muted-foreground/60 mt-1">Join Hoysala Degree College in 3 simple steps</p>

            <div className="flex items-center justify-center gap-2 mt-4">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-body text-xs font-bold transition-all duration-300 ${
                    step >= s ? "bg-secondary/20 text-secondary border border-secondary/40" : "bg-muted/10 text-muted-foreground/40 border border-border/20"
                  }`}>
                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && <div className={`w-8 h-0.5 rounded-full transition-all duration-300 ${step > s ? "bg-secondary/40" : "bg-border/20"}`} />}
                </div>
              ))}
            </div>
            <p className="font-body text-[11px] text-muted-foreground/50 mt-2">
              {step === 1 ? "Step 1: Account" : step === 2 ? "Step 2: Personal" : "Step 3: Academic"}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4 relative z-10">
              <div className="relative">
                <User className={iconClass("fullName")} />
                <input type="text" placeholder="Full Name *" value={form.fullName}
                  onChange={e => set("fullName", e.target.value)}
                  onFocus={() => setFocused("fullName")} onBlur={() => setFocused(null)}
                  className={inputClass("fullName")} />
              </div>
              <div className="relative">
                <Mail className={iconClass("email")} />
                <input type="email" placeholder="Email Address *" value={form.email}
                  onChange={e => set("email", e.target.value)}
                  onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                  className={inputClass("email")} />
              </div>
              <div className="relative">
                <Lock className={iconClass("password")} />
                <input type={showPassword ? "text" : "password"} placeholder="Password * (min 6 chars)" value={form.password}
                  onChange={e => set("password", e.target.value)}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                  className={inputClass("password")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-secondary/60 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className={iconClass("confirmPassword")} />
                <input type={showPassword ? "text" : "password"} placeholder="Confirm Password *" value={form.confirmPassword}
                  onChange={e => set("confirmPassword", e.target.value)}
                  onFocus={() => setFocused("confirmPassword")} onBlur={() => setFocused(null)}
                  className={inputClass("confirmPassword")} />
              </div>
              <Button type="button" onClick={() => { if (validateStep1()) setStep(2); }}
                className="w-full h-12 rounded-xl font-body font-semibold text-sm relative overflow-hidden group"
                style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(45 80% 55%), hsl(40 85% 50%))" }}>
                <span className="relative z-10 text-background flex items-center gap-2">
                  Continue <Sparkles className="w-4 h-4" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5 relative z-10">
              <div className="relative">
                <Phone className={iconClass("phone")} />
                <input type="tel" placeholder="Phone Number *" value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
                  className={inputClass("phone")} />
              </div>
              <div className="relative">
                <Calendar className={iconClass("dob")} />
                <input type="date" value={form.dateOfBirth}
                  onChange={e => set("dateOfBirth", e.target.value)}
                  onFocus={() => setFocused("dob")} onBlur={() => setFocused(null)}
                  className={`${inputClass("dob")} ${!form.dateOfBirth ? "text-muted-foreground/50" : ""}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Users className={iconClass("father")} />
                  <input type="text" placeholder="Father's Name" value={form.fatherName}
                    onChange={e => set("fatherName", e.target.value)}
                    onFocus={() => setFocused("father")} onBlur={() => setFocused(null)}
                    className={inputClass("father")} />
                </div>
                <div className="relative">
                  <Users className={iconClass("mother")} />
                  <input type="text" placeholder="Mother's Name" value={form.motherName}
                    onChange={e => set("motherName", e.target.value)}
                    onFocus={() => setFocused("mother")} onBlur={() => setFocused(null)}
                    className={inputClass("mother")} />
                </div>
              </div>
              <div className="relative">
                <Phone className={iconClass("parentPhone")} />
                <input type="tel" placeholder="Parent's Phone" value={form.parentPhone}
                  onChange={e => set("parentPhone", e.target.value)}
                  onFocus={() => setFocused("parentPhone")} onBlur={() => setFocused(null)}
                  className={inputClass("parentPhone")} />
              </div>
              <div className="relative">
                <MapPin className={iconClass("address")} />
                <textarea placeholder="Full Address *" value={form.address} rows={2}
                  onChange={e => set("address", e.target.value)}
                  onFocus={() => setFocused("address")} onBlur={() => setFocused(null)}
                  className={`${inputClass("address")} resize-none pt-3`} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setStep(1)}
                  className="flex-1 h-12 rounded-xl font-body text-sm border-border/30 bg-transparent text-muted-foreground hover:bg-muted/10">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button type="button" onClick={() => { if (validateStep2()) setStep(3); }}
                  className="flex-[2] h-12 rounded-xl font-body font-semibold text-sm relative overflow-hidden group"
                  style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(45 80% 55%), hsl(40 85% 50%))" }}>
                  <span className="relative z-10 text-background flex items-center gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </span>
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
              <div className="relative">
                <BookOpen className={iconClass("course")} />
                <select required value={form.courseId}
                  onChange={e => set("courseId", e.target.value)}
                  onFocus={() => setFocused("course")} onBlur={() => setFocused(null)}
                  className={`${inputClass("course")} appearance-none cursor-pointer ${!form.courseId ? "text-muted-foreground/50" : ""}`}>
                  <option value="" className="bg-background">Select Course of Interest *</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="bg-background text-foreground">{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <GraduationCap className={iconClass("qual")} />
                <select required value={form.previousQualification}
                  onChange={e => set("previousQualification", e.target.value)}
                  onFocus={() => setFocused("qual")} onBlur={() => setFocused(null)}
                  className={`${inputClass("qual")} appearance-none cursor-pointer ${!form.previousQualification ? "text-muted-foreground/50" : ""}`}>
                  <option value="" className="bg-background">Previous Qualification *</option>
                  {QUALIFICATIONS.map(q => (
                    <option key={q} value={q} className="bg-background text-foreground">{q}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Award className={iconClass("perc")} />
                <select required value={form.previousPercentage}
                  onChange={e => set("previousPercentage", e.target.value)}
                  onFocus={() => setFocused("perc")} onBlur={() => setFocused(null)}
                  className={`${inputClass("perc")} appearance-none cursor-pointer ${!form.previousPercentage ? "text-muted-foreground/50" : ""}`}>
                  <option value="" className="bg-background">Previous Score Range *</option>
                  {PERCENTAGE_RANGES.map(p => (
                    <option key={p} value={p} className="bg-background text-foreground">{p}</option>
                  ))}
                </select>
              </div>

              {/* Optional profile photo */}
              <div className="rounded-xl border border-border/30 bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-3">
                  <label className="relative w-16 h-16 rounded-full overflow-hidden border border-secondary/30 bg-muted/10 flex items-center justify-center cursor-pointer flex-shrink-0 hover:border-secondary/60 transition-colors">
                    {photoPreview ? (
                      <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-muted-foreground/50" />
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs text-foreground/80 font-semibold">Profile Photo <span className="text-muted-foreground/50 font-normal">(optional)</span></p>
                    <p className="font-body text-[10px] text-muted-foreground/60 mt-0.5">JPG/PNG, up to 5 MB. Shown on your dashboard.</p>
                  </div>
                  {photoPreview && (
                    <button type="button" onClick={clearPhoto} className="text-muted-foreground/50 hover:text-destructive transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3.5 my-2">
                <p className="font-body text-[11px] text-amber-300/80 leading-relaxed">
                  <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />
                  After registration we'll log you in instantly and set up fingerprint, location & camera permissions.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setStep(2)}
                  className="flex-1 h-12 rounded-xl font-body text-sm border-border/30 bg-transparent text-muted-foreground hover:bg-muted/10">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button type="submit" disabled={loading}
                  className="flex-[2] h-12 rounded-xl font-body font-semibold text-sm relative overflow-hidden group"
                  style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(45 80% 55%), hsl(40 85% 50%))" }}>
                  <span className="relative z-10 text-background flex items-center gap-2">
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Creating Account...</>
                    ) : (
                      <><GraduationCap className="w-4 h-4" /> Create Account</>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Button>
              </div>
            </form>
          )}

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
