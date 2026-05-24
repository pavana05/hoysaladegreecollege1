import SEOHead from "@/components/SEOHead";
import SectionHeading from "@/components/SectionHeading";
import ScrollReveal from "@/components/ScrollReveal";
import PageHeader from "@/components/PageHeader";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Sparkles, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAPS_LINK = "https://maps.app.goo.gl/vgj6BFejregTZTrT8";

const contactInfo = [
  {
    icon: MapPin, label: "Address",
    value: "K.R.P. Arcade, UCO Bank Building, Paramanna Layout, Nelamangala Town, Bengaluru Rural Dist. - 562 123",
    link: MAPS_LINK, external: true,
    accentHsl: "217 72% 50%", iconBg: "bg-blue-500/10", iconColor: "text-blue-500",
  },
  {
    icon: Phone, label: "Phone Numbers",
    value: "7676272167 • 7975344252 • 8618181383 • 7892508243",
    link: "tel:7676272167",
    accentHsl: "142 70% 40%", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500",
  },
  {
    icon: Mail, label: "Email",
    value: "principal.hoysaladegreecollege@gmail.com",
    link: "mailto:principal.hoysaladegreecollege@gmail.com",
    accentHsl: "220 55% 48%", iconBg: "bg-primary/10", iconColor: "text-primary",
  },
  {
    icon: Clock, label: "Office Hours",
    value: "Mon – Sat: 9:00 AM – 5:00 PM",
    link: undefined,
    accentHsl: "42 87% 55%", iconBg: "bg-secondary/15", iconColor: "text-secondary",
  },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: form.name, email: form.email, subject: form.subject, message: form.message,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to send message. Please try again.");
    } else {
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }, 4000);
    }
  };

  const inputClass =
    "w-full border border-border rounded-xl px-4 py-3.5 font-body text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all duration-300 placeholder:text-muted-foreground/30 hover:border-primary/20 hover:shadow-sm";

  return (
    <div className="page-enter">
      <SEOHead
        title="Contact Us"
        description="Contact Hoysala Degree College, Nelamangala. Phone: +91 76762 72167. Email: principal.hoysaladegreecollege@gmail.com."
        canonical="/contact"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: "Hoysala Degree College",
          url: "https://hoysaladegreecollege.in",
          email: "principal.hoysaladegreecollege@gmail.com",
          telephone: "+91-76762-72167",
          address: {
            "@type": "PostalAddress",
            streetAddress: "K.R.P. Arcade, UCO Bank Building, Paramanna Layout",
            addressLocality: "Nelamangala Town",
            addressRegion: "Karnataka",
            postalCode: "562123",
            addressCountry: "IN",
          },
          geo: { "@type": "GeoCoordinates", latitude: 13.0977, longitude: 77.3927 },
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            opens: "09:00",
            closes: "17:00",
          },
        }}
      />
      <PageHeader title="Contact Us" subtitle="We'd love to hear from you" />

      <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="container max-w-5xl px-4 relative">
          <ScrollReveal>
            <SectionHeading title="Get in Touch" subtitle="Reach out for admissions, queries, or campus visits." />
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-10 sm:gap-12 mt-10">
            {/* Contact Info */}
            <ScrollReveal>
              <div className="space-y-3.5">
                {contactInfo.map((item, i) => (
                  <div
                    key={item.label}
                    className="relative flex gap-4 items-start p-5 rounded-2xl border border-border/40 bg-card group overflow-hidden active:scale-[0.98] touch-manipulation"
                    style={{
                      transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
                      animationDelay: `${i * 80}ms`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px -12px hsla(${item.accentHsl}, 0.12)`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = "";
                    }}
                  >
                    {/* Hover gradient */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                      style={{ background: `linear-gradient(135deg, hsla(${item.accentHsl}, 0.04), transparent)` }} />
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"
                      style={{ background: `linear-gradient(90deg, transparent, hsla(${item.accentHsl}, 0.4), transparent)` }} />
                    
                    <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-400 shadow-sm border border-border/30 relative z-10`}>
                      <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div className="min-w-0 relative z-10">
                      <p className="font-body text-[10px] font-bold text-foreground uppercase tracking-[0.15em] mb-1">{item.label}</p>
                      {item.link ? (
                        <a href={item.link} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined}
                          className="font-body text-sm text-muted-foreground hover:text-primary transition-colors duration-200 break-words inline-flex items-start gap-1 group/link">
                          {item.value}
                          {item.external && <ArrowUpRight className="w-3 h-3 shrink-0 mt-1 opacity-0 group-hover/link:opacity-100 transition-opacity" />}
                        </a>
                      ) : (
                        <p className="font-body text-sm text-muted-foreground">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Quick dial */}
                <div className="pt-3">
                  <p className="font-body text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">Quick Dial</p>
                  <div className="flex flex-wrap gap-2">
                    {["7676272167", "7975344252", "8618181383", "7892508243"].map((num) => (
                      <a key={num} href={`tel:${num}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-card border border-border font-body text-xs text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 hover:shadow-lg transition-all duration-300 active:scale-95 touch-manipulation">
                        <Phone className="w-3 h-3" /> {num}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Message Form */}
            <ScrollReveal delay={200}>
              <div className="relative p-6 sm:p-8 rounded-3xl border border-border/40 bg-card overflow-hidden"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
                {/* Ambient glow */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-secondary/[0.04] rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />

                {submitted ? (
                  <div className="flex flex-col items-center justify-center h-72 animate-scale-bounce text-center">
                    <div className="relative w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5 shadow-lg border border-emerald-500/20">
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                      <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-secondary animate-sparkle" />
                    </div>
                    <h3 className="font-display text-2xl font-bold text-foreground mb-2">Message Sent! 🎉</h3>
                    <p className="font-body text-sm text-muted-foreground max-w-xs">We'll get back to you soon.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2 relative z-10">
                      <Send className="w-5 h-5 text-primary" /> Send us a Message
                    </h3>
                    <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-body text-[10px] font-bold text-foreground block mb-1.5 uppercase tracking-wider">Full Name *</label>
                          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Your name" />
                        </div>
                        <div>
                          <label className="font-body text-[10px] font-bold text-foreground block mb-1.5 uppercase tracking-wider">Email *</label>
                          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="your@email.com" />
                        </div>
                      </div>
                      <div>
                        <label className="font-body text-[10px] font-bold text-foreground block mb-1.5 uppercase tracking-wider">Subject</label>
                        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} placeholder="How can we help?" />
                      </div>
                      <div>
                        <label className="font-body text-[10px] font-bold text-foreground block mb-1.5 uppercase tracking-wider">Message *</label>
                        <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={`${inputClass} resize-none`} placeholder="Write your message here..." />
                      </div>
                      <button type="submit" disabled={submitting}
                        className="relative w-full group overflow-hidden px-6 py-4 rounded-full font-body text-sm font-bold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 disabled:opacity-60 shadow-lg btn-magnetic"
                        style={{
                          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--navy-dark)))",
                          boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                        }}>
                        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-full" />
                        <span className="relative flex items-center justify-center gap-2">
                          {submitting ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> Send Message</>
                          )}
                        </span>
                      </button>
                    </form>
                  </>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="relative overflow-hidden">
        <div className="h-[1.5px] bg-gradient-to-r from-transparent via-secondary/25 to-transparent" />
        <div className="relative overflow-hidden">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1942.5!2d77.3957!3d13.0966!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae259e8d244d8b%3A0x29e31a1d91bdce16!2sHoysala%20Degree%20College!5e0!3m2!1sen!2sin!4v1711000000000"
            width="100%" height="340" style={{ border: 0, display: "block" }} allowFullScreen loading="lazy"
            className="w-full opacity-90 hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none" />
        </div>
        <div className="flex justify-center py-5 bg-background">
          <a href={MAPS_LINK} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-body font-bold text-sm hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 shadow-lg hover:shadow-xl"
            style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.25)" }}>
            <MapPin className="w-4 h-4" /> Get Directions
          </a>
        </div>
      </section>
    </div>
  );
}
