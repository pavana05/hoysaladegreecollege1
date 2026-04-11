import { useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EnquireNowCTA() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", course: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error("Name and email are required");
    setLoading(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: form.name,
      email: form.email,
      subject: `Enquiry: ${form.course || "General"}`,
      message: `Phone: ${form.phone}\nCourse Interest: ${form.course}\n\n${form.message}`,
    });
    setLoading(false);
    if (error) return toast.error("Failed to submit. Please try again.");
    toast.success("Enquiry submitted! We'll get back to you soon.");
    setForm({ name: "", email: "", phone: "", course: "", message: "" });
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-4 sm:bottom-8 sm:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl group transition-all duration-500 hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(42,87%,58%), hsl(38,92%,48%))",
          boxShadow: "0 8px 32px hsla(42,87%,52%,0.4)",
        }}
        aria-label="Enquire Now"
      >
        <MessageCircle className="w-6 h-6 text-foreground group-hover:rotate-12 transition-transform duration-300" />
        {/* Ping animation */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "hsl(42,87%,55%)" }} />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border/40 bg-card shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-4 duration-300">
            {/* Close */}
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Quick Enquiry</h3>
              <p className="font-body text-sm text-muted-foreground mt-1">Get in touch with our admissions team</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <input
                placeholder="Full Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary/50 transition-colors"
                required
              />
              <input
                placeholder="Email *"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary/50 transition-colors"
                required
              />
              <input
                placeholder="Phone Number"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary/50 transition-colors"
              />
              <select
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm font-body text-foreground focus:outline-none focus:border-secondary/50 transition-colors"
              >
                <option value="">Select Course Interest</option>
                <option value="BCA">BCA</option>
                <option value="B.Com Regular">B.Com Regular</option>
                <option value="B.Com Professional">B.Com Professional (CA/CS/CMA)</option>
                <option value="BBA">BBA</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                placeholder="Your message (optional)"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary/50 transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-body text-sm font-bold text-foreground flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, hsl(42,87%,58%), hsl(38,92%,48%))",
                  boxShadow: "0 4px 20px hsla(42,87%,52%,0.3)",
                }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "Submitting..." : "Submit Enquiry"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
