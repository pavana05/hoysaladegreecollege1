import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "hdc_timetable_selected_day";
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getTodayName = (): string => {
  const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  if (todayIndex === 0 || todayIndex === 6) return days[0]; // Sunday → Monday, Saturday stays Saturday
  return days[todayIndex - 1];
};

const STANDARD_PERIODS = [
  "9:00 - 9:50", "9:50 - 10:40", "10:50 - 11:40", "11:40 - 12:30",
  "1:10 - 2:00", "2:00 - 2:50", "2:50 - 3:40",
];

const parseStartMinutes = (period: string): number => {
  const match = period.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) {
    const numMatch = period.match(/\b(\d)\b/);
    if (numMatch) {
      const idx = parseInt(numMatch[1]) - 1;
      const std = STANDARD_PERIODS[idx];
      if (std) { const tm = std.match(/(\d{1,2}):(\d{2})/); if (tm) return parseInt(tm[1]) * 60 + parseInt(tm[2]); }
    }
    return 999;
  }
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const normalizedH = h >= 1 && h <= 8 ? h + 12 : h;
  return normalizedH * 60 + m;
};

const sortByPeriod = (a: any, b: any) => parseStartMinutes(a.period) - parseStartMinutes(b.period);

export default function StudentTimetable() {
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ["student-info", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*, courses(name, code)").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["student-timetable", student?.course_id],
    queryFn: async () => {
      let query = supabase.from("timetables").select("*");
      if (student?.course_id) query = query.or(`course_id.eq.${student.course_id},course_id.is.null`);
      const { data } = await query;
      return data || [];
    },
    enabled: !!student,
  });

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return saved && days.includes(saved) ? saved : getTodayName();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedDay);
  }, [selectedDay]);

  return (
    <div className="space-y-5 relative">
      {/* Premium dark ambient backdrop (no gold) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-[140px]" style={{ background: "radial-gradient(circle, hsla(225,60%,40%,0.22), transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-24 w-[460px] h-[460px] rounded-full blur-[150px]" style={{ background: "radial-gradient(circle, hsla(265,55%,35%,0.18), transparent 70%)" }} />
      </div>

      {/* Premium Header — graphite glass */}
      <div className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 border border-white/[0.06]"
           style={{ background: "linear-gradient(135deg, hsl(230,14%,8%) 0%, hsl(228,16%,11%) 55%, hsl(230,12%,7%) 100%)" }}>
        <div aria-hidden className="absolute -top-24 -right-16 w-56 h-56 rounded-full blur-[90px]" style={{ background: "radial-gradient(circle, hsla(225,70%,55%,0.18), transparent 70%)" }} />
        <div aria-hidden className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full blur-[90px]" style={{ background: "radial-gradient(circle, hsla(265,60%,50%,0.14), transparent 70%)" }} />
        <div aria-hidden className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(0,0%,100%,0.18), transparent)" }} />

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-white/10"
               style={{ background: "linear-gradient(135deg, hsla(225,70%,55%,0.22), hsla(225,70%,55%,0.05))" }}>
            <Calendar className="w-5 h-5 text-white/90" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-white tracking-tight truncate">My Timetable</h2>
            <p className="font-body text-sm text-white/55 truncate">
              {student?.courses?.name ? `${student.courses.name} (${student.courses.code})` : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Day Selector — premium glass pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {days.map((day) => {
          const isActive = day === selectedDay;
          const dayEntries = entries.filter((e: any) => e.day_of_week === day).sort(sortByPeriod);
          const hasData = dayEntries.length > 0;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`
                relative flex-shrink-0 px-4 py-2.5 rounded-2xl font-display text-xs font-bold tracking-wide
                transition-all duration-300 border backdrop-blur-xl
                ${isActive
                  ? "text-white border-white/15 shadow-[0_8px_24px_-8px_hsla(225,70%,55%,0.5)] scale-[1.04]"
                  : "text-white/55 border-white/[0.06] hover:text-white/90 hover:border-white/15"
                }
              `}
              style={isActive
                ? { background: "linear-gradient(135deg, hsl(225,55%,28%), hsl(230,50%,18%))" }
                : { background: "hsla(230,14%,10%,0.6)" }
              }
            >
              <span className="flex items-center gap-1.5">
                {day.slice(0, 3)}
                {hasData && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsla(225,70%,60%,0.7)" }} />
                )}
              </span>
            </button>
          );
        })}
      </div>


      {/* Selected Day Schedule Card */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-5 sm:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-secondary/[0.02]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-foreground">{selectedDay}'s Schedule</h3>
              <span className="font-body text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
                {entries.filter((e: any) => e.day_of_week === selectedDay).length} periods
              </span>
            </div>
            <div className="space-y-2">
              {(() => {
                const de = entries.filter((e: any) => e.day_of_week === selectedDay).sort(sortByPeriod);
                if (de.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="font-body text-sm text-muted-foreground">No classes scheduled for {selectedDay}.</p>
                    </div>
                  );
                }
                return de.map((e: any, i: number) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/20 border border-border/20 hover:bg-muted/40 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms`, opacity: 0, animationFillMode: 'forwards' }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-display text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-semibold text-foreground truncate">{e.subject}</p>
                      <p className="font-body text-xs text-muted-foreground">{e.period}</p>
                    </div>
                    {e.teacher_name && (
                      <span className="font-body text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full shrink-0">
                        {e.teacher_name}
                      </span>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Full week overview */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-3xl p-5 sm:p-7">
          <h3 className="font-display text-sm font-bold text-foreground mb-5">Full Week Overview</h3>
          <div className="space-y-5">
            {days.map((day) => {
              const de = entries.filter((e: any) => e.day_of_week === day).sort(sortByPeriod);
              if (de.length === 0) return null;
              return (
                <div key={day}>
                  <h4 className="font-display text-xs font-bold text-primary uppercase tracking-wider mb-2.5">{day}</h4>
                  <div className="space-y-1.5">
                    {de.map((e: any, i: number) => (
                      <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/40 transition-all duration-200 animate-fade-in"
                        style={{ animationDelay: `${i * 30}ms`, opacity: 0, animationFillMode: 'forwards' }}>
                        <span className="font-body text-xs font-bold text-primary w-24 shrink-0">{e.period}</span>
                        <span className="font-body text-sm text-foreground">{e.subject}</span>
                        {e.teacher_name && <span className="font-body text-xs text-muted-foreground">({e.teacher_name})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {entries.length === 0 && <p className="font-body text-sm text-muted-foreground text-center py-8">No timetable data available.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
