import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, User, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

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

const getCurrentPeriodIndex = (entries: any[]) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (let i = 0; i < entries.length; i++) {
    const startMin = parseStartMinutes(entries[i].period);
    // Estimate end time as start + 50 minutes
    if (currentMinutes >= startMin && currentMinutes < startMin + 50) {
      return i;
    }
    // If we're before this period starts
    if (currentMinutes < startMin) {
      return i - 0.5; // indicates gap before this class
    }
  }
  return -1;
};

const getPeriodStatus = (entry: any, index: number, currentIdx: number) => {
  if (index < Math.floor(currentIdx)) return "completed";
  if (Math.floor(currentIdx) === index) return "current";
  return "upcoming";
};

export default function TodayTimetableWidget() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDay = days.includes(today) ? today : "Monday";
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: student } = useQuery({
    queryKey: ["student-info-widget", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*, courses(name, code)").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["student-timetable-widget", student?.course_id],
    queryFn: async () => {
      let query = supabase.from("timetables").select("*");
      if (student?.course_id) query = query.or(`course_id.eq.${student.course_id},course_id.is.null`);
      const { data } = await query;
      return data || [];
    },
    enabled: !!student,
  });

  const dayEntries = entries
    .filter((e: any) => e.day_of_week === todayDay)
    .sort(sortByPeriod);

  const currentIdx = getCurrentPeriodIndex(dayEntries);
  const nowStr = currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/80 backdrop-blur-xl">
      {/* Header */}
      <div className="relative p-5 pb-3">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] bg-primary/[0.06]" />
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Today's Schedule</h3>
              <p className="font-body text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {todayDay} · {nowStr}
              </p>
            </div>
          </div>
          <Link 
            to="/dashboard/student/timetable" 
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-body text-[11px] font-semibold hover:bg-primary/15 transition-all duration-200"
          >
            Full View <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Timetable List */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : dayEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="font-body text-sm text-muted-foreground">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEntries.map((e: any, i: number) => {
              const status = getPeriodStatus(e, i, currentIdx);
              const isCurrent = status === "current";
              const isCompleted = status === "completed";
              
              return (
                <div
                  key={e.id}
                  className={`group relative flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 ${
                    isCurrent
                      ? "bg-primary/[0.08] border border-primary/25 shadow-lg shadow-primary/5"
                      : isCompleted
                      ? "bg-muted/30 border border-border/30 opacity-60"
                      : "bg-card/60 border border-border/40 hover:bg-muted/30 hover:border-border/60"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Time Column */}
                  <div className={`shrink-0 w-[4.5rem] text-center py-2 rounded-xl ${
                    isCurrent 
                      ? "bg-primary/10 ring-1 ring-primary/20" 
                      : "bg-muted/40"
                  }`}>
                    <p className={`font-body text-[11px] font-bold ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                      {e.period}
                    </p>
                    {isCurrent && (
                      <span className="inline-block mt-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>

                  {/* Subject Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-body text-sm font-semibold truncate ${
                      isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                    }`}>
                      {e.subject}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {e.teacher_name && (
                        <span className="font-body text-[10px] text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> {e.teacher_name}
                        </span>
                      )}
                      {e.room && (
                        <span className="font-body text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {e.room}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isCurrent ? (
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-body text-[10px] font-bold uppercase tracking-wider ring-1 ring-primary/20">
                        Now
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-body text-[10px] font-bold uppercase tracking-wider">
                        Done
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary font-body text-[10px] font-bold uppercase tracking-wider">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
