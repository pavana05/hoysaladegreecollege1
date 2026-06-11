import { useState } from "react";
import { Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] bg-primary/[0.08]" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">My Timetable</h2>
              <p className="font-body text-sm text-muted-foreground">
                {student?.courses?.name ? `${student.courses.name} (${student.courses.code})` : "Loading..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full week overview */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />)}
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
