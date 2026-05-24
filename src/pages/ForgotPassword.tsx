import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import collegeLogo from "@/assets/college-logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email"); return; }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Reset link sent! Check your email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <SEOHead title="Forgot Password" description="Reset your Hoysala Degree College portal password. Enter your registered email address and we'll send you a secure password reset link." canonical="/forgot-password" noIndex />

      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #050507 0%, #0E1016 35%, #141824 55%, #0a0c12 100%)" }} />
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

      <div className="relative z-10 w-full max-w-[440px] mx-4">
        <div
          className="relative rounded-[28px] overflow-hidden"
          style={{
            background: "linear-gradient(165deg, rgba(14, 16, 22, 0.92), rgba(20, 24, 36, 0.96))",
            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px hsla(42, 87%, 55%, 0.06)",
            backdropFilter: "blur(60px)",
          }}
        >
          <div className="h-[2px] relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 5%, hsl(42 87% 55% / 0.5) 30%, hsl(42 80% 65% / 0.6) 50%, hsl(42 87% 55% / 0.5) 70%, transparent 95%)" }} />
          </div>

          <div className="px-9 pt-11 pb-9 sm:px-11 relative z-10">
            <div className="text-center mb-10">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="relative w-[76px] h-[76px] rounded-[20px] overflow-hidden border border-white/[0.08]"
                  style={{ boxShadow: "0 12px 40px hsla(42, 87%, 55%, 0.1)" }}>
                  <img src={collegeLogo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              {sent ? (
                <>
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h1 className="font-display text-[24px] font-bold text-white tracking-tight">Check Your Email</h1>
                  <p className="font-body text-[13px] text-white/35 mt-2.5 leading-relaxed">
                    We've sent a password reset link to <span className="text-white/60">{email}</span>. Click the link in the email to reset your password.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-display text-[24px] font-bold text-white tracking-tight">Forgot Password?</h1>
                  <p className="font-body text-[13px] text-white/35 mt-2.5">Enter your email and we'll send you a reset link</p>
                </>
              )}
            </div>

            {!sent && (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="font-body text-[10px] font-semibold text-white/35 block mb-2.5 uppercase tracking-[0.18em]">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-white/15" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl py-3.5 pl-11 pr-4 font-body text-[13px] text-white bg-white/[0.03] border border-white/[0.05] outline-none transition-all duration-400 focus:border-[hsla(42,87%,55%,0.3)] focus:bg-[hsla(42,87%,55%,0.04)] focus:shadow-[0_0_0_4px_hsla(42,87%,55%,0.05)] placeholder:text-white/15"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl border-none cursor-pointer overflow-hidden font-body font-semibold text-[14px] text-[#0E1016] transition-all duration-400 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, hsl(42 87% 45%), hsl(42 87% 55%) 50%, hsl(42 70% 40%))",
                    boxShadow: "0 12px 32px -8px hsla(42, 87%, 55%, 0.25), 0 0 0 1px hsla(42, 87%, 55%, 0.12)",
                  }}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}

            <div className="text-center mt-6">
              <a href="/login" className="font-body text-[11px] text-white/20 hover:text-white/40 transition-colors inline-flex items-center gap-1.5">
                <ArrowLeft className="w-3 h-3" /> Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
