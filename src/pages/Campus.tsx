import { Building, Eye, Download } from "lucide-react";
import { useState } from "react";
import SEOHead from "@/components/SEOHead";

export default function Campus() {
  const [showPreview, setShowPreview] = useState(false);
  const pdfUrl = "/downloads/campus.pdf";

  return (
    <>
      <SEOHead title="Campus" description="Explore the modern campus facilities of Hoysala Degree College." canonical="/campus" />

      {/* PDF Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowPreview(false)} />
          <div className="relative w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden border border-border/40 shadow-2xl bg-card animate-in zoom-in-95 duration-300">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <a href={pdfUrl} download className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-all duration-300 flex items-center gap-2 backdrop-blur-sm border border-primary/20">
                <Download className="w-4 h-4" /> Download
              </a>
              <button onClick={() => setShowPreview(false)} className="w-10 h-10 rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 text-foreground/70 hover:text-foreground hover:bg-card transition-all duration-300 flex items-center justify-center text-lg font-medium">
                ✕
              </button>
            </div>
            <iframe src={pdfUrl} className="w-full h-full" title="Campus Brochure" />
          </div>
        </div>
      )}

      <div className="min-h-screen py-16 sm:py-24 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 -right-64 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -left-64 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container px-4 max-w-6xl mx-auto relative">
          {/* Header */}
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Building className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Our Campus</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Explore Our <span className="text-primary">Campus</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Take a virtual tour of our state-of-the-art campus designed to inspire learning, creativity, and growth.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Interactive Map/Tour Section */}
            <div className="relative group rounded-3xl border border-border/40 bg-card overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-primary/5 hover:border-primary/30">
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent z-10 pointer-events-none" />
              
              {/* Map Placeholder Image */}
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                <img 
                  src="/lovable-uploads/chatbot-reference.jpg" 
                  alt="Campus Map Placeholder" 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* Hotspots */}
                <div className="absolute top-1/3 left-1/3 z-20 group/spot">
                  <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-pulse" />
                  <div className="absolute top-6 -left-1/2 min-w-max px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-md border border-border text-xs font-medium opacity-0 group-hover/spot:opacity-100 transition-opacity -translate-x-1/4">
                    Main Building
                  </div>
                </div>
                <div className="absolute top-1/2 right-1/3 z-20 group/spot">
                  <div className="w-4 h-4 bg-secondary rounded-full shadow-[0_0_15px_rgba(var(--secondary),0.5)] animate-pulse" style={{ animationDelay: "500ms" }} />
                  <div className="absolute top-6 -left-1/2 min-w-max px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-md border border-border text-xs font-medium opacity-0 group-hover/spot:opacity-100 transition-opacity -translate-x-1/4">
                    Library
                  </div>
                </div>
                <div className="absolute bottom-1/3 left-1/2 z-20 group/spot">
                  <div className="w-4 h-4 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse" style={{ animationDelay: "1000ms" }} />
                  <div className="absolute top-6 -left-1/2 min-w-max px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-md border border-border text-xs font-medium opacity-0 group-hover/spot:opacity-100 transition-opacity -translate-x-1/4">
                    Sports Ground
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-20">
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">Interactive Campus Map</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-md">
                  Click on the highlighted hotspots to explore different areas of our campus in detail.
                </p>
                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-all duration-300 border border-primary/20 text-sm w-fit">
                  <Eye className="w-4 h-4" /> Start Virtual Tour
                </button>
              </div>
            </div>

            {/* PDF Card & Features List */}
            <div className="space-y-6">
              <div className="group relative rounded-3xl border border-border/30 bg-card/60 backdrop-blur-sm p-8 transition-all duration-500 hover:shadow-xl hover:border-primary/30 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                
                <div className="relative z-10 flex items-start gap-5">
                  <div className="w-16 h-16 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <Building className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">Campus Brochure</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                      View our comprehensive brochure featuring architecture, interiors, and facility details.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium transition-all duration-300 hover:opacity-90 active:scale-[0.97] text-sm shadow-lg shadow-primary/20"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <a
                        href={pdfUrl}
                        download
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card hover:bg-muted text-foreground font-medium transition-all duration-300 border border-border/40 hover:border-border/60 active:scale-[0.97] text-sm"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Facts */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: "Modern Classrooms", desc: "Smart boards & AC", icon: "🏫" },
                  { title: "Digital Library", desc: "10,000+ Resources", icon: "📚" },
                  { title: "Computer Labs", desc: "High-end systems", icon: "💻" },
                  { title: "Sports Complex", desc: "Indoor & Outdoor", icon: "⚽" },
                ].map((fact, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-colors">
                    <span className="text-2xl mb-3 block">{fact.icon}</span>
                    <h4 className="font-bold text-foreground text-sm mb-1">{fact.title}</h4>
                    <p className="text-xs text-muted-foreground">{fact.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
