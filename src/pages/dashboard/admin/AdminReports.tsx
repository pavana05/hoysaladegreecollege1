import { useState } from "react";
import { IOSSelect } from "@/components/ui/ios-select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Users, Clock, IndianRupee, BarChart3, Filter, ChevronDown, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type ReportType = "students" | "attendance" | "marks" | "fees";

function toCSV(headers: string[], rows: string[][]) {
  return [headers.join(","), ...rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
}

function downloadFile(content: string, filename: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const REPORT_TYPES: { key: ReportType; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { key: "students", label: "Student Directory", icon: Users, desc: "All active students with course, semester, and contact details", color: "bg-blue-500/10 text-blue-500" },
  { key: "attendance", label: "Attendance Report", icon: Clock, desc: "Student-wise attendance summary with present/absent counts", color: "bg-emerald-500/10 text-emerald-500" },
  { key: "marks", label: "Marks Report", icon: BarChart3, desc: "All marks with subject, semester, obtained & max marks", color: "bg-purple-500/10 text-purple-500" },
  { key: "fees", label: "Fee Collection Report", icon: IndianRupee, desc: "Student fee summary with total, paid, pending, and payment history", color: "bg-amber-500/10 text-amber-500" },
];

export default function AdminReports() {
  const [selected, setSelected] = useState<ReportType>("students");
  const [courseFilter, setCourseFilter] = useState("all");
  const [semFilter, setSemFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["report-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const generateReport = async () => {
    setGenerating(true);
    try {
      const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");

      if (selected === "students") {
        let q = supabase.from("students").select("roll_number, semester, year_level, phone, parent_phone, course_id, user_id, admission_year, courses(name, code)").eq("is_active", true);
        if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
        if (semFilter !== "all") q = q.eq("semester", Number(semFilter));
        const { data: students } = await q;
        if (!students?.length) { toast.error("No data found"); setGenerating(false); return; }
        const userIds = students.map(s => s.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
        const headers = ["Roll No", "Name", "Email", "Course", "Semester", "Year", "Phone", "Parent Phone", "Admission Year"];
        const rows = students.map((s: any) => {
          const p = profiles?.find(pr => pr.user_id === s.user_id);
          return [s.roll_number, p?.full_name || "", p?.email || "", s.courses?.name || "", s.semester, s.year_level, s.phone, s.parent_phone, s.admission_year];
        });
        downloadFile(toCSV(headers, rows), `students_${timestamp}.csv`);
      }

      if (selected === "attendance") {
        let q = supabase.from("attendance").select("student_id, date, status, subject, students(roll_number, user_id, course_id, courses(code))");
        if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
        const { data: records } = await q;
        if (!records?.length) { toast.error("No data found"); setGenerating(false); return; }
        const userIds = [...new Set(records.map((r: any) => r.students?.user_id).filter(Boolean))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        // Aggregate per student
        const agg: Record<string, { name: string; roll: string; course: string; total: number; present: number; absent: number }> = {};
        records.forEach((r: any) => {
          const sid = r.student_id;
          if (!agg[sid]) {
            const p = profiles?.find(pr => pr.user_id === r.students?.user_id);
            agg[sid] = { name: p?.full_name || "", roll: r.students?.roll_number || "", course: r.students?.courses?.code || "", total: 0, present: 0, absent: 0 };
          }
          agg[sid].total++;
          if (r.status === "present") agg[sid].present++; else agg[sid].absent++;
        });
        const headers = ["Roll No", "Name", "Course", "Total Classes", "Present", "Absent", "Attendance %"];
        const rows = Object.values(agg).map(a => [a.roll, a.name, a.course, a.total, a.present, a.absent, a.total > 0 ? Math.round((a.present / a.total) * 100) + "%" : "0%"]);
        downloadFile(toCSV(headers, rows as any), `attendance_${timestamp}.csv`);
      }

      if (selected === "marks") {
        let q = supabase.from("marks").select("subject, exam_type, obtained_marks, max_marks, semester, student_id, students(roll_number, user_id, courses(code))");
        if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
        if (semFilter !== "all") q = q.eq("semester", Number(semFilter));
        const { data: records } = await q;
        if (!records?.length) { toast.error("No data found"); setGenerating(false); return; }
        const userIds = [...new Set(records.map((r: any) => r.students?.user_id).filter(Boolean))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const headers = ["Roll No", "Name", "Course", "Semester", "Exam Type", "Subject", "Obtained", "Max", "Percentage"];
        const rows = records.map((r: any) => {
          const p = profiles?.find(pr => pr.user_id === r.students?.user_id);
          const pct = r.max_marks > 0 ? Math.round((r.obtained_marks / r.max_marks) * 100) + "%" : "0%";
          return [r.students?.roll_number || "", p?.full_name || "", r.students?.courses?.code || "", r.semester, r.exam_type, r.subject, r.obtained_marks, r.max_marks, pct];
        });
        downloadFile(toCSV(headers, rows as any), `marks_${timestamp}.csv`);
      }

      if (selected === "fees") {
        let q = supabase.from("students").select("id, roll_number, total_fee, fee_paid, semester, user_id, courses(name, code)").eq("is_active", true);
        if (courseFilter !== "all") q = q.eq("course_id", courseFilter);
        const { data: students } = await q;
        if (!students?.length) { toast.error("No data found"); setGenerating(false); return; }
        const userIds = students.map(s => s.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const headers = ["Roll No", "Name", "Course", "Semester", "Total Fee", "Fee Paid", "Pending", "Status"];
        const rows = students.map((s: any) => {
          const p = profiles?.find(pr => pr.user_id === s.user_id);
          const pending = Math.max(0, (s.total_fee || 0) - (s.fee_paid || 0));
          return [s.roll_number, p?.full_name || "", s.courses?.name || "", s.semester, s.total_fee || 0, s.fee_paid || 0, pending, pending > 0 ? "Pending" : "Paid"];
        });
        downloadFile(toCSV(headers, rows as any), `fees_${timestamp}.csv`);
      }

      setLastGenerated(format(new Date(), "dd MMM yyyy, hh:mm a"));
      toast.success("Report downloaded successfully!");
    } catch (err) {
      toast.error("Failed to generate report");
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Reports & Export Center</h2>
          <p className="font-body text-sm text-muted-foreground mt-1">Generate and download institutional reports</p>
        </div>
        {lastGenerated && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-4 py-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Last report: {lastGenerated}
          </div>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => setSelected(rt.key)}
            className={`relative text-left p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
              selected === rt.key
                ? "bg-card border-primary/40 shadow-lg ring-2 ring-primary/10"
                : "bg-card/50 border-border/50 hover:border-border"
            }`}
          >
            {selected === rt.key && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${rt.color.split(" ")[0]}`}>
              <rt.icon className={`w-5 h-5 ${rt.color.split(" ")[1]}`} />
            </div>
            <h3 className="font-body text-sm font-semibold text-foreground mb-1">{rt.label}</h3>
            <p className="font-body text-[11px] text-muted-foreground leading-relaxed">{rt.desc}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border/60 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-body text-sm font-semibold text-foreground">Filters</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="font-body text-xs text-muted-foreground block mb-2">Course</label>
            <div className="relative">
              <IOSSelect value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                className="appearance-none w-full bg-background border border-border rounded-xl px-4 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="all">All Courses</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </IOSSelect>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {(selected === "students" || selected === "marks") && (
            <div>
              <label className="font-body text-xs text-muted-foreground block mb-2">Semester</label>
              <div className="relative">
                <IOSSelect value={semFilter} onChange={e => setSemFilter(e.target.value)}
                  className="appearance-none w-full bg-background border border-border rounded-xl px-4 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="all">All Semesters</option>
                  {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </IOSSelect>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              <Download className={`w-4 h-4 ${generating ? "animate-bounce" : ""}`} />
              {generating ? "Generating..." : "Download CSV"}
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-muted/30 border border-border/40 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold text-foreground mb-1">About Reports</h4>
            <p className="font-body text-xs text-muted-foreground leading-relaxed">
              Reports are generated in CSV format which can be opened in Excel, Google Sheets, or any spreadsheet application. 
              Use the filters above to narrow down the data before exporting. All reports contain the latest data from the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
