import { Link } from "react-router-dom";
import { GraduationCap, BookOpen, Users, Phone, FileText, Award, Download, Calendar } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const links = [
  { icon: GraduationCap, label: "Admissions", path: "/admissions", color: "42 87% 55%" },
  { icon: BookOpen, label: "Courses", path: "/courses", color: "215 90% 55%" },
  { icon: Users, label: "Faculty", path: "/faculty", color: "145 65% 42%" },
  { icon: Calendar, label: "Events", path: "/events", color: "280 60% 55%" },
  { icon: FileText, label: "Notices", path: "/notices", color: "0 70% 58%" },
  { icon: Award, label: "Achievements", path: "/achievements", color: "42 75% 50%" },
  { icon: Download, label: "Downloads", path: "/download", color: "180 60% 45%" },
  { icon: Phone, label: "Contact", path: "/contact", color: "330 60% 55%" },
];

export default function QuickLinksStrip() {
  return (
    <section className="py-10 sm:py-14 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      <div className="container px-5 sm:px-4">
        <ScrollReveal>
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Quick Access</h2>
            <p className="font-body text-xs sm:text-sm text-muted-foreground mt-1">Navigate to key sections instantly</p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
          {links.map((link, i) => (
            <ScrollReveal key={link.label} delay={i * 50}>
              <Link to={link.path} className="group flex flex-col items-center gap-2 p-3 rounded-2xl border border-border/30 bg-card/50 hover:border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-500 active:scale-95 touch-manipulation">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 border border-white/[0.04]"
                  style={{ background: `hsla(${link.color}, 0.1)` }}
                >
                  <link.icon className="w-4 h-4 sm:w-5 sm:h-5 transition-all duration-500 group-hover:rotate-6" style={{ color: `hsl(${link.color})` }} />
                </div>
                <span className="font-body text-[10px] sm:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-center leading-tight">
                  {link.label}
                </span>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
