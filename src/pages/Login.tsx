import { useState, useEffect, useRef } from "react";
import SEOHead from "@/components/SEOHead";
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, Shield, Fingerprint, Sparkles } from "lucide-react";
import collegeLogo from "@/assets/college-logo.png";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validatePassword } from "@/lib/password-validation";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

type Role = "student" | "teacher" | "principal" | "admin";

const roles: { value: Role; label: string; icon: string; desc: string }[] = [
  { value: "student", label: "Student", icon: "🎓", desc: "Academic portal" },
  { value: "teacher", label: "Teacher", icon: "📚", desc: "Class management" },
  { value: "principal", label: "Principal", icon: "🏛️", desc: "Institution head" },
  { value: "admin", label: "Admin", icon: "⚙️", desc: "System control" },
];

export default function Login() {
  const [searchParams] = useSearchParams();
  const isSignupMode = searchParams.get("mode") === "signup";
  const [mode] = useState<"login" | "signup">(isSignupMode ? "signup" : "login");
  const [role, setRole] = useState<Role>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const { signIn, signUp, role: currentUserRole, user } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const canSignup = isSignupMode && currentUserRole === "admin";

  const handleResendVerification = async () => {
    if (!email) { toast.error("Enter your email above first"); return; }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
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

  useEffect(() => {
    if (user && currentUserRole && !isSignupMode) {
      const path = currentUserRole === "admin" ? "/dashboard/admin"
        : currentUserRole === "principal" ? "/dashboard/principal"
        : currentUserRole === "teacher" ? "/dashboard/teacher"
        : "/dashboard/student";
      navigate(path, { replace: true });
    }
  }, [user, currentUserRole, isSignupMode, navigate]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    if (mode === "signup") {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) { toast.error(pwCheck.message); return; }
    }
    setLoading(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) { toast.error(error.message); setLoading(false); }
      else {
        if (rememberMe) {
          sessionStorage.setItem("hdc_remember", "1");
          localStorage.setItem("hdc_remember", "1");
        } else {
          sessionStorage.setItem("hdc_remember", "1");
          localStorage.removeItem("hdc_remember");
        }
        toast.success("Signed in successfully!");
      }
    } else {
      if (!canSignup) { toast.error("Only admins can create new accounts"); setLoading(false); return; }
      if (!fullName) { toast.error("Please enter the full name"); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName, role);
      if (error) toast.error(error.message);
      else toast.success("Account created! User can sign in after email verification.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <SEOHead title="Login" description="Sign in to the Hoysala Degree College portal to access your student, teacher, principal, or admin dashboard with courses, marks, attendance and notices." canonical="/login" noIndex />

      {/* Deep graphite background */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #050507 0%, #0E1016 35%, #141824 55%, #0a0c12 100%)" }} />

      {/* Animated aurora mesh — warm gold tones */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="login-aurora login-aurora-1" />
        <div className="login-aurora login-aurora-2" />
        <div className="login-aurora login-aurora-3" />
      </div>

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

      {/* Radial spotlight — muted gold */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle, hsl(42 87% 55%), transparent 70%)" }} />

      {/* Floating orbs — warm amber (hidden on small screens) */}
      <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] rounded-full opacity-[0.03] animate-float hidden sm:block"
        style={{ background: "radial-gradient(circle, hsl(42 80% 60%), transparent 60%)", animationDuration: "8s" }} />
      <div className="absolute bottom-[10%] right-[8%] w-[250px] h-[250px] rounded-full opacity-[0.025] animate-float hidden sm:block"
        style={{ background: "radial-gradient(circle, hsl(42 70% 50%), transparent 60%)", animationDuration: "10s", animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-[440px] px-4 sm:mx-4 login-card-enter">

        {/* Main glassmorphism card */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden"
          style={{
            background: "linear-gradient(165deg, rgba(14, 16, 22, 0.92), rgba(20, 24, 36, 0.96))",
            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px hsla(42, 87%, 55%, 0.06), 0 0 80px -20px hsla(42, 87%, 55%, 0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(60px)",
          }}
        >
          {/* Interactive spotlight follow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06] transition-opacity duration-500 rounded-[28px]"
            style={{ background: `radial-gradient(500px circle at ${mousePos.x}% ${mousePos.y}%, hsla(42, 87%, 55%, 0.08), transparent 50%)` }}
          />

          {/* Top accent bar — muted gold gradient */}
          <div className="h-[2px] relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 5%, hsl(42 87% 55% / 0.5) 30%, hsl(42 80% 65% / 0.6) 50%, hsl(42 87% 55% / 0.5) 70%, transparent 95%)" }} />
            <div className="absolute inset-0 login-shimmer-bar" />
          </div>

          <div className="px-6 pt-8 pb-7 sm:px-9 sm:pt-11 sm:pb-9 relative z-10">

            {/* Logo */}
            <div className="text-center mb-7 sm:mb-10">
              <div className="relative inline-flex items-center justify-center mb-4 sm:mb-6">
                <div className="relative w-[60px] h-[60px] sm:w-[76px] sm:h-[76px] rounded-[16px] sm:rounded-[20px] overflow-hidden border border-white/[0.08]"
                  style={{ boxShadow: "0 12px 40px hsla(42, 87%, 55%, 0.1), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                  <img src={collegeLogo} alt="Hoysala Degree College Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              <h1 className="font-display text-[20px] sm:text-[24px] font-bold text-white tracking-tight leading-tight">
                {canSignup ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="font-body text-[12px] sm:text-[13px] text-white/35 mt-2 sm:mt-2.5 tracking-wide font-light">
                {canSignup ? "Register a new user on the portal" : "Sign in to your college portal"}
              </p>
            </div>

            {/* Role selection for signup */}
            {canSignup && (
              <div className="mb-6 sm:mb-8">
                <label className="font-body text-[10px] font-semibold text-white/40 block mb-2.5 sm:mb-3 uppercase tracking-[0.18em]">Account Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {roles.map((r) => (
                    <button key={r.value} type="button" onClick={() => setRole(r.value)}
                      className={`group p-3 sm:p-3.5 rounded-2xl border text-center transition-all duration-400 font-body text-[11px] ${
                        role === r.value
                          ? "border-secondary/30 bg-secondary/10 text-secondary font-bold shadow-[0_0_20px_-4px_hsla(42,87%,55%,0.15)]"
                          : "border-white/[0.04] text-white/30 hover:border-secondary/10 hover:bg-secondary/[0.03] hover:text-white/50"
                      }`}>
                      <div className="text-lg mb-1 sm:mb-1.5 transition-transform duration-300 group-hover:scale-110">{r.icon}</div>
                      <div>{r.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
              {canSignup && (
                <div className="login-field-enter" style={{ animationDelay: "0.1s" }}>
                  <label className="font-body text-[10px] font-semibold text-white/35 block mb-2.5 uppercase tracking-[0.18em]">Full Name</label>
                  <div className="relative group">
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] transition-all duration-400 ${focused === "fullName" ? "text-secondary scale-110 drop-shadow-[0_0_6px_hsla(42,87%,55%,0.4)]" : "text-white/15"}`} />
                    <input
                      value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className={`login-input pl-12 ${focused === "fullName" ? "login-input-focused" : ""}`}
                      placeholder="Enter full name"
                      onFocus={() => setFocused("fullName")} onBlur={() => setFocused(null)}
                    />
                  </div>
                </div>
              )}

              <div className="login-field-enter" style={{ animationDelay: "0.15s" }}>
                <label className="font-body text-[10px] font-semibold text-white/35 block mb-2.5 uppercase tracking-[0.18em]">Email Address</label>
                <div className="relative group">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] transition-all duration-400 ${focused === "email" ? "text-secondary scale-110 drop-shadow-[0_0_6px_hsla(42,87%,55%,0.4)]" : "text-white/15"}`} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={`login-input pl-12 ${focused === "email" ? "login-input-focused" : ""}`}
                    placeholder="you@example.com"
                    onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                  />
                </div>
              </div>

              <div className="login-field-enter" style={{ animationDelay: "0.2s" }}>
                <label className="font-body text-[10px] font-semibold text-white/35 block mb-2.5 uppercase tracking-[0.18em]">Password</label>
                <div className="relative group">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] transition-all duration-400 ${focused === "password" ? "text-secondary scale-110 drop-shadow-[0_0_6px_hsla(42,87%,55%,0.4)]" : "text-white/15"}`} />
                  <input
                    type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    className={`login-input pl-12 pr-12 ${focused === "password" ? "login-input-focused" : ""}`}
                    placeholder="Enter your password"
                    onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/15 hover:text-secondary/60 transition-colors duration-300 p-1 rounded-lg">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!canSignup && (
                <div className="flex items-center justify-between login-field-enter" style={{ animationDelay: "0.22s" }}>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-3.5 h-3.5 rounded border-white/10 bg-white/[0.03] text-secondary focus:ring-secondary/30 focus:ring-offset-0 accent-[hsl(42,87%,55%)] cursor-pointer" />
                    <span className="font-body text-[11px] text-white/30 group-hover:text-white/45 transition-colors duration-300 select-none">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="font-body text-[11px] text-white/30 hover:text-secondary/60 transition-colors duration-300">
                    Forgot password?
                  </Link>
                </div>
              )}

              <div className="pt-1 login-field-enter" style={{ animationDelay: "0.25s" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn w-full"
                >
                  <span className="absolute inset-0 rounded-2xl login-btn-shimmer" />
                  <span className="relative z-10 flex items-center justify-center gap-2.5 font-body font-semibold text-[14px]">
                    {loading ? (
                      <>
                        <div className="w-[18px] h-[18px] border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-white/80">Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {canSignup ? "Create Account" : "Sign In"}
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>

            {/* Passkey / Biometric Login */}
            {!canSignup && (
              <div className="mt-5 login-field-enter" style={{ animationDelay: "0.3s" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="font-body text-[10px] text-white/20 uppercase tracking-[0.15em]">or</span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.PublicKeyCredential) {
                      toast.error("Passkeys are not supported on this device/browser");
                      return;
                    }
                    try {
                      setLoading(true);
                      const { supabase } = await import("@/integrations/supabase/client");

                      const { data: opts, error: optErr } = await supabase.functions.invoke("passkey-authenticate", {
                        body: { action: "get-options", email: email || undefined },
                      });
                      if (optErr || opts?.error) { toast.error(optErr?.message || opts?.error); setLoading(false); return; }

                      const b64ToArr = (v: string) => {
                        const n = v.replace(/-/g, "+").replace(/_/g, "/");
                        const p = n.padEnd(Math.ceil(n.length / 4) * 4, "=");
                        return Uint8Array.from(atob(p), c => c.charCodeAt(0));
                      };

                      const hostname = window.location.hostname;
                      const clientRpId = hostname === "localhost" ? "localhost" : hostname;

                      const credential = await navigator.credentials.get({
                        publicKey: {
                          challenge: b64ToArr(opts.challenge),
                          rpId: clientRpId,
                          allowCredentials: opts.allowCredentials?.map((c: any) => ({
                            id: b64ToArr(c.id),
                            type: c.type,
                            transports: c.transports,
                          })) || [],
                          userVerification: "preferred",
                          timeout: 60000,
                        },
                      }) as PublicKeyCredential;

                      if (!credential) { toast.error("Authentication cancelled"); setLoading(false); return; }

                      const rawId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
                      
                      const assertionResponse = credential.response as AuthenticatorAssertionResponse;
                      const clientDataJSON = btoa(String.fromCharCode(...new Uint8Array(assertionResponse.clientDataJSON))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
                      const authenticatorData = btoa(String.fromCharCode(...new Uint8Array(assertionResponse.authenticatorData))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
                      const signature = btoa(String.fromCharCode(...new Uint8Array(assertionResponse.signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

                      const { data: authData, error: authErr } = await supabase.functions.invoke("passkey-authenticate", {
                        body: { action: "authenticate", credentialId: rawId, clientDataJSON, authenticatorData, signature },
                      });

                      if (authErr || authData?.error) { toast.error(authErr?.message || authData?.error); setLoading(false); return; }

                      const tokenHash = authData?.token_hash || authData?.token;

                      if (tokenHash && authData?.email) {
                        let verifyError: any = null;

                        const primaryAttempt = await supabase.auth.verifyOtp({
                          token_hash: tokenHash,
                          type: "magiclink",
                        } as any);
                        verifyError = primaryAttempt.error;

                        if (verifyError) {
                          const fallbackAttempt = await supabase.auth.verifyOtp({
                            token_hash: tokenHash,
                            type: "email",
                          } as any);
                          verifyError = fallbackAttempt.error;
                        }

                        if (verifyError) {
                          toast.error("Passkey login token was invalid. Please try passkey sign-in again.");
                          setLoading(false);
                          return;
                        }

                        sessionStorage.setItem("hdc_remember", "1");
                        localStorage.setItem("hdc_remember", "1");
                        toast.success("Signed in with passkey!");
                      } else {
                        toast.error("Passkey verification token missing. Please try again.");
                        setLoading(false);
                        return;
                      }
                    } catch (err: any) {
                      console.error("Passkey auth error:", err);
                      if (err.name === "NotAllowedError") {
                        toast.error("Authentication was cancelled or timed out");
                      } else if (err?.message?.includes("not found") || err?.message?.includes("Passkey not found")) {
                        toast.error("Passkey not found for this domain. Re-register your passkey on " + window.location.hostname);
                      } else {
                        toast.error(err?.message || "Passkey authentication failed");
                      }
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 flex items-center justify-center gap-2.5 group"
                >
                  <Fingerprint className="w-5 h-5 text-white/30 group-hover:text-secondary/60 transition-colors duration-300" />
                  <span className="font-body text-[13px] font-medium text-white/40 group-hover:text-white/60 transition-colors duration-300">
                    Sign in with Passkey
                  </span>
                </button>
              </div>
            )}

            {/* Trust bar */}
            <div className="flex items-center justify-center gap-4 sm:gap-5 mt-6 sm:mt-8 pt-5 sm:pt-7 border-t border-white/[0.04]">
              {[
                { icon: Shield, label: "256-bit SSL" },
                { icon: Fingerprint, label: "Secure Auth" },
                { icon: Lock, label: "Encrypted" },
              ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1 sm:gap-1.5 text-white/20 group cursor-default">
                  <Icon className="w-3 h-3 group-hover:text-secondary/40 transition-colors duration-300" />
                  <span className="font-body text-[9px] sm:text-[10px] group-hover:text-white/30 transition-colors duration-300">{label}</span>
                </div>
              ))}
            </div>

            {/* Links */}
            <div className="text-center mt-4 sm:mt-5 space-y-2">
              <p className="font-body text-[11px] text-white/25">
                New student?{" "}
                <Link to="/register" className="text-secondary/60 hover:text-secondary transition-colors font-semibold">Register here</Link>
              </p>
              <Link to="/" className="font-body text-[11px] text-white/20 hover:text-secondary/50 transition-all duration-300 inline-flex items-center gap-1.5 group">
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Website
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center font-body text-[10px] text-white/10 mt-5 sm:mt-7 tracking-wider px-4">
          Hoysala Degree College · Affiliated to Bangalore University
        </p>
      </div>

      <style>{`
        /* === LOGIN PAGE PREMIUM STYLES === */

        .login-input {
          width: 100%;
          border-radius: 16px;
          height: 48px;
          padding: 0 14px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          line-height: 48px;
          color: white;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          outline: none;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }
        .login-input.pl-12 {
          padding-left: 48px !important;
        }
        .login-input.pr-12 {
          padding-right: 48px !important;
        }
        .login-input::placeholder {
          color: rgba(148, 163, 184, 0.25);
        }
        .login-input:hover {
          border-color: hsla(42, 87%, 55%, 0.1);
          background: rgba(255, 255, 255, 0.04);
        }
        .login-input-focused,
        .login-input:focus {
          border-color: hsla(42, 87%, 55%, 0.3) !important;
          background: hsla(42, 87%, 55%, 0.04) !important;
          box-shadow: 0 0 0 4px hsla(42, 87%, 55%, 0.05), 0 0 20px -4px hsla(42, 87%, 55%, 0.06);
        }

        .login-submit-btn {
          position: relative;
          padding: 14px 20px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          overflow: hidden;
          background: linear-gradient(135deg, hsl(42 87% 45%), hsl(42 87% 55%) 50%, hsl(42 70% 40%));
          color: #0E1016;
          box-shadow: 0 12px 32px -8px hsla(42, 87%, 55%, 0.25), 0 0 0 1px hsla(42, 87%, 55%, 0.12), inset 0 1px 0 rgba(255,255,255,0.15);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 20px 48px -12px hsla(42, 87%, 55%, 0.35), 0 0 0 1px hsla(42, 87%, 55%, 0.18), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-btn-shimmer {
          overflow: hidden;
        }
        .login-btn-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 55%, transparent 60%);
          transform: translateX(-110%);
          animation: loginShimmer 3s ease-in-out infinite;
        }

        @keyframes loginShimmer {
          0%, 70%, 100% { transform: translateX(-110%); }
          50% { transform: translateX(110%); }
        }

        .login-shimmer-bar {
          background: linear-gradient(90deg, transparent, hsla(42, 87%, 55%, 0.5), transparent);
          transform: translateX(-100%);
          animation: loginBarShimmer 4s ease-in-out infinite;
        }
        @keyframes loginBarShimmer {
          0%, 60%, 100% { transform: translateX(-100%); }
          40% { transform: translateX(100%); }
        }

        /* logo glow removed */

        .login-card-enter {
          animation: loginCardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes loginCardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.96); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        .login-field-enter {
          animation: loginFieldIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes loginFieldIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Aurora background orbs */
        .login-aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
        }
        .login-aurora-1 {
          width: 500px; height: 500px;
          top: -15%; left: -10%;
          background: radial-gradient(circle, hsla(42, 87%, 55%, 0.06), transparent 60%);
          animation: auroraFloat1 12s ease-in-out infinite;
        }
        .login-aurora-2 {
          width: 400px; height: 400px;
          bottom: -10%; right: -10%;
          background: radial-gradient(circle, hsla(42, 60%, 45%, 0.04), transparent 60%);
          animation: auroraFloat2 15s ease-in-out infinite;
        }
        .login-aurora-3 {
          width: 350px; height: 350px;
          top: 40%; left: 50%;
          background: radial-gradient(circle, hsla(42, 87%, 55%, 0.035), transparent 60%);
          animation: auroraFloat3 10s ease-in-out infinite;
        }
        @keyframes auroraFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 30px) scale(1.1); }
          66% { transform: translate(-20px, -20px) scale(0.95); }
        }
        @keyframes auroraFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -30px) scale(1.15); }
        }
        @keyframes auroraFloat3 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-50%, -40px) scale(1.1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
