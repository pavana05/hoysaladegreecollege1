import SEOHead from "@/components/SEOHead";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle, Upload, GraduationCap, Phone, Calendar, User, Mail, MapPin, School, Percent, Users, Sparkles, ExternalLink, ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const initialForm = {
  full_name: "", email: "", phone: "", date_of_birth: "", gender: "",
  course: "", father_name: "", mother_name: "", address: "",
  previous_school: "", percentage_12th: ""
};

const steps = [
  { label: "Photo", icon: Upload },
  { label: "Personal", icon: User },
  { label: "Family", icon: Users },
  { label: "Address", icon: MapPin },
];

export default function Apply() {
  const [form, setForm] = useState(initialForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [thankYouData, setThankYouData] = useState<{ appNumber: string; email: string } | null>(null);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!photoFile;
    if (step === 1) return !!form.full_name && !!form.email && !!form.phone && !!form.course;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.course) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("admission-photos").upload(path, photoFile);
      if (!uploadErr) photoUrl = path;
    }

    const { data, error } = await supabase.from("admission_applications").insert({
      full_name: form.full_name, email: form.email, phone: form.phone,
      date_of_birth: form.date_of_birth || null, gender: form.gender || null,
      course: form.course, father_name: form.father_name || null,
      mother_name: form.mother_name || null, address: form.address || null,
      previous_school: form.previous_school || null, percentage_12th: form.percentage_12th || null,
      photo_url: photoUrl
    }).select("application_number").maybeSingle();

    if (error || !data) {
      setSubmitting(false);
      toast.error("Failed to submit application. Please try again.");
      return;
    }

    try {
      await supabase.functions.invoke("send-application-email", {
        body: { email: form.email, fullName: form.full_name, applicationNumber: data.application_number, status: "submitted" }
      });
    } catch { /* non-critical */ }

    setSubmitting(false);
    setThankYouData({ appNumber: data.application_number, email: form.email });
    setForm(initialForm);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const inputClass = "w-full border border-border rounded-xl px-4 py-3.5 font-body text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-300 placeholder:text-muted-foreground/40 hover:border-primary/30";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  const trackingUrl = thankYouData ? `/application-status?app=${thankYouData.appNumber}&email=${encodeURIComponent(thankYouData.email)}` : "";

  return (
    <div className="page-enter">
      <SEOHead title="Apply Online - Admissions 2026-27" description="Submit your online application for admission to Hoysala Degree College." canonical="/apply" />
      <PageHeader title="Online Application" subtitle="Academic Year 2026–27" />

      {/* Thank You Dialog */}
      <Dialog open={!!thankYouData} onOpenChange={(open) => { if (!open) { setThankYouData(null); navigate(trackingUrl); } }}>
        <DialogContent className="sm:max-w-lg text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <Sparkles className="w-6 h-6 text-secondary animate-pulse" />
            <h2 className="font-display text-2xl font-bold text-foreground">Thank You for Applying! 🎉</h2>
            <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-sm">
              Our office management will review your profile and contact you shortly.
            </p>
            {thankYouData && (
              <div className="w-full bg-muted/30 rounded-xl p-4 border border-border/40 text-left">
                <p className="font-body text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Your Application</p>
                <p className="font-body text-sm text-foreground"><span className="font-semibold">Application No:</span> {thankYouData.appNumber}</p>
                <p className="font-body text-sm text-foreground"><span className="font-semibold">Email:</span> {thankYouData.email}</p>
              </div>
            )}
            <Link to={trackingUrl} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-body font-bold text-sm hover:scale-[1.02] transition-all duration-300 shadow-lg" style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)" }}>
              <ExternalLink className="w-4 h-4" /> Track Your Application
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <section className="py-12 sm:py-20 bg-background">
        <div className="container max-w-4xl px-4">
          {/* Step Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {steps.map((s, i) => (
                <div key={s.label} className="flex items-center gap-0 flex-1">
                  <button
                    onClick={() => i <= step && setStep(i)}
                    className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${i <= step ? "opacity-100" : "opacity-40"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                        i === step
                          ? "bg-primary text-primary-foreground border-primary shadow-lg"
                          : i < step
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                      style={i === step ? { boxShadow: "0 4px 16px hsl(var(--primary) / 0.3)" } : undefined}
                    >
                      {i < step ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                    </div>
                    <span className={`font-body text-[10px] font-semibold ${i === step ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-[2px] mx-2 rounded-full mt-[-16px]" style={{
                      background: i < step
                        ? "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.5))"
                        : "hsl(var(--border))"
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card p-6 sm:p-10 border border-border/50 hover:!transform-none hover:!scale-100">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground shadow-lg">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground tracking-tight">
                  Step {step + 1}: {steps[step].label} Details
                </h2>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  {step === 0 && "Upload a passport-size photograph"}
                  {step === 1 && "Enter your personal and contact details"}
                  {step === 2 && "Family and academic background"}
                  {step === 3 && "Residential address and submit"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10">
              {/* Step 0: Photo */}
              <div className={`space-y-5 ${step === 0 ? "" : "hidden"}`} style={{ animation: step === 0 ? "fade-in-up 0.5s ease-out" : undefined }}>
                <div className="relative rounded-2xl border border-dashed border-primary/20 hover:border-primary/40 transition-all duration-300 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-secondary/[0.03] group-hover:from-primary/[0.06] group-hover:to-secondary/[0.06] transition-all duration-500" />
                  <div className="relative p-6 sm:p-8 text-center">
                    {photoPreview ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-40 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-body px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /> {photoFile?.name}
                        </div>
                        <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="font-body text-xs text-destructive hover:underline">
                          Remove & Re-upload
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                          <Upload className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <p className="font-body text-sm font-bold text-foreground">Upload Your Photo</p>
                          <p className="font-body text-xs text-muted-foreground mt-1">Passport-size photo (JPG/PNG, max 5MB)</p>
                        </div>
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        <span className="font-body text-xs font-semibold text-primary px-4 py-2 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors">
                          Choose File
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 1: Personal */}
              <div className={`space-y-4 ${step === 1 ? "" : "hidden"}`} style={{ animation: step === 1 ? "fade-in-up 0.5s ease-out" : undefined }}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                      <input name="full_name" type="text" value={form.full_name} onChange={handleChange} required placeholder="Enter your full name" className={`${inputClass} pl-10`} />
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                      <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="your@email.com" className={`${inputClass} pl-10`} />
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Phone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                      <input name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="10-digit number" className={`${inputClass} pl-10`} />
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                      <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className={`${inputClass} pl-10`} />
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Gender</label>
                    <select name="gender" value={form.gender} onChange={handleChange} className={selectClass}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Course *</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                      <select name="course" value={form.course} onChange={handleChange} required className={`${selectClass} pl-10`}>
                        <option value="">Select Course</option>
                        <option value="BCA">BCA</option>
                        <option value="B.Com Regular">B.Com Regular</option>
                        <option value="B.Com Professional">B.Com Professional</option>
                        <option value="BBA">BBA</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Family */}
              <div className={`space-y-4 ${step === 2 ? "" : "hidden"}`} style={{ animation: step === 2 ? "fade-in-up 0.5s ease-out" : undefined }}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Father's Name</label>
                    <input name="father_name" type="text" value={form.father_name} onChange={handleChange} placeholder="Father's full name" className={inputClass} />
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Mother's Name</label>
                    <input name="mother_name" type="text" value={form.mother_name} onChange={handleChange} placeholder="Mother's full name" className={inputClass} />
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Previous PU College</label>
                    <div className="relative">
                      <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                      <input name="previous_school" type="text" value={form.previous_school} onChange={handleChange} placeholder="College name" className={`${inputClass} pl-10`} />
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground block mb-1.5">12th Percentage</label>
                    <div className="relative">
                      <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                      <input name="percentage_12th" type="text" value={form.percentage_12th} onChange={handleChange} placeholder="e.g. 78.5%" className={`${inputClass} pl-10`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Address */}
              <div className={`space-y-4 ${step === 3 ? "" : "hidden"}`} style={{ animation: step === 3 ? "fade-in-up 0.5s ease-out" : undefined }}>
                <div>
                  <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Residential Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} rows={4}
                    className={`${inputClass} resize-none`} placeholder="Your complete residential address" />
                </div>

                {/* Summary preview */}
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 mt-4">
                  <p className="font-body text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Application Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-body">
                    <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{form.full_name || "—"}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-medium">{form.email || "—"}</span></div>
                    <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground font-medium">{form.phone || "—"}</span></div>
                    <div><span className="text-muted-foreground">Course:</span> <span className="text-foreground font-medium">{form.course || "—"}</span></div>
                    <div><span className="text-muted-foreground">Photo:</span> <span className="text-foreground font-medium">{photoFile ? "✓ Uploaded" : "—"}</span></div>
                    <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground font-medium">{form.gender || "—"}</span></div>
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-6 mt-6 border-t border-border/50">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="font-body rounded-full h-12 px-6 flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                )}
                <div className="flex-1" />
                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => canProceed() && setStep(s => s + 1)}
                    disabled={!canProceed()}
                    className="h-12 px-8 rounded-full font-body text-sm font-bold text-primary-foreground flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                      boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                    }}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || !form.full_name || !form.email || !form.phone || !form.course}
                    className="relative flex-1 max-w-xs group overflow-hidden h-14 sm:h-12 rounded-full font-body text-sm font-bold text-primary-foreground transition-all duration-500 hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))", boxShadow: "0 6px 30px hsl(var(--primary) / 0.35)" }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-full" />
                    <span className="relative flex items-center justify-center gap-2.5">
                      {submitting ?
                        <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Submitting...</> :
                        <><CheckCircle className="w-5 h-5" /> Submit Application</>
                      }
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
