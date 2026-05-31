import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Download, Printer, Calendar, BookOpen, X, Ticket, Sparkles, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";
import jsPDF from "jspdf";
import collegeLogo from "@/assets/college-logo.png";
import saiBabaImg from "@/assets/sai-baba.png";

interface HallTicketSession {
  id: string;
  title: string;
  course_id: string | null;
  semester: number | null;
  exam_type: string;
  is_active: boolean;
  created_at: string;
}

interface HallTicketSubject {
  id: string;
  session_id: string;
  subject: string;
  exam_date: string;
  exam_time: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface StudentForTicket {
  id: string;
  roll_number: string;
  semester: number | null;
  course_id: string | null;
  avatar_url: string | null;
  user_id: string;
  profile?: { full_name: string };
  course?: { name: string; code: string };
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export default function AdminHallTickets() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<HallTicketSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedSession, setSelectedSession] = useState<HallTicketSession | null>(null);
  const [subjects, setSubjects] = useState<HallTicketSubject[]>([]);
  const [students, setStudents] = useState<StudentForTicket[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStage, setGenStage] = useState("");

  // Create session form
  const [newTitle, setNewTitle] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [newExamType, setNewExamType] = useState("internal");

  // Add subject form
  const [newSubject, setNewSubject] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamTime, setNewExamTime] = useState("10:00 AM - 1:00 PM");

  // Filter for bulk generation
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  useEffect(() => {
    fetchSessions();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchSubjects(selectedSession.id);
      fetchStudents(selectedSession);
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    const { data } = await supabase.from("hall_ticket_sessions").select("*").order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true);
    if (data) setCourses(data);
  };

  const fetchSubjects = async (sessionId: string) => {
    const { data } = await supabase.from("hall_ticket_subjects").select("*").eq("session_id", sessionId).order("exam_date");
    if (data) setSubjects(data);
  };

  const fetchStudents = async (session: HallTicketSession) => {
    let query = supabase.from("students").select("id, roll_number, semester, course_id, avatar_url, user_id").eq("is_active", true);
    if (session.course_id) query = query.eq("course_id", session.course_id);
    if (session.semester) query = query.eq("semester", session.semester);
    const { data } = await query;
    if (data) {
      const userIds = data.map(s => s.user_id);
      const courseIds = [...new Set(data.map(s => s.course_id).filter(Boolean))];
      const [profilesRes, coursesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
        courseIds.length > 0 ? supabase.from("courses").select("id, name, code").in("id", courseIds as string[]) : Promise.resolve({ data: [] })
      ]);
      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const courseMap = new Map((coursesRes.data || []).map(c => [c.id, c]));
      setStudents(data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) as any,
        course: s.course_id ? courseMap.get(s.course_id) as any : undefined
      })));
    }
  };

  const createSession = async () => {
    if (!newTitle.trim()) return toast.error("Title is required");
    const { error } = await supabase.from("hall_ticket_sessions").insert({
      title: newTitle,
      course_id: newCourseId || null,
      semester: newSemester ? parseInt(newSemester) : null,
      exam_type: newExamType,
      created_by: user?.id
    });
    if (error) return toast.error(error.message);
    toast.success("Session created");
    setShowCreateDialog(false);
    setNewTitle(""); setNewCourseId(""); setNewSemester(""); setNewExamType("internal");
    fetchSessions();
  };

  const addSubject = async () => {
    if (!selectedSession || !newSubject.trim() || !newExamDate) return toast.error("Fill all fields");
    const { error } = await supabase.from("hall_ticket_subjects").insert({
      session_id: selectedSession.id,
      subject: newSubject,
      exam_date: newExamDate,
      exam_time: newExamTime
    });
    if (error) return toast.error(error.message);
    toast.success("Subject added");
    setNewSubject(""); setNewExamDate(""); setNewExamTime("10:00 AM - 1:00 PM");
    fetchSubjects(selectedSession.id);
  };

  const removeSubject = async (id: string) => {
    await supabase.from("hall_ticket_subjects").delete().eq("id", id);
    if (selectedSession) fetchSubjects(selectedSession.id);
  };

  const deleteSession = async (id: string) => {
    await supabase.from("hall_ticket_sessions").delete().eq("id", id);
    if (selectedSession?.id === id) { setSelectedSession(null); setSubjects([]); setStudents([]); }
    fetchSessions();
    toast.success("Session deleted");
  };

  const generateHallTicketPDF = async (studentList: StudentForTicket[]) => {
    if (!selectedSession || subjects.length === 0) return toast.error("Add subjects first");
    if (studentList.length === 0) return toast.error("No students found");

    setGenerating(true);
    setGenProgress(0);
    setGenStage("Initializing...");

    try {
      setGenStage("Loading college assets...");
      setGenProgress(10);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = 210, ph = 297, m = 10;
      const halfH = (ph - m * 2 - 4) / 2;

      let [logoImg, saiImg] = [null as HTMLImageElement | null, null as HTMLImageElement | null];
      try {
        [logoImg, saiImg] = await Promise.all([loadImage(collegeLogo), loadImage(saiBabaImg)]);
      } catch {}
      setGenProgress(20);
      setGenStage("Generating tickets...");

      const totalStudents = studentList.length;

      for (let si = 0; si < totalStudents; si++) {
        const pct = 20 + Math.round((si / totalStudents) * 75);
        setGenProgress(pct);
        if (si % 5 === 0) setGenStage(`Generating ticket ${si + 1} of ${totalStudents}...`);

        const posIndex = si % 2;
        if (si > 0 && posIndex === 0) doc.addPage();

        const student = studentList[si];
        const courseName = student.course?.name || "N/A";
        const courseCode = student.course?.code || "";
        const offsetY = m + posIndex * (halfH + 4);

        // Outer border
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(1.2);
        doc.roundedRect(m, offsetY, pw - m * 2, halfH, 3, 3);
        // Inner border
        doc.setDrawColor(140, 100, 40);
        doc.setLineWidth(0.5);
        doc.roundedRect(m + 2, offsetY + 2, pw - m * 2 - 4, halfH - 4, 2, 2);
        // Second inner border
        doc.setDrawColor(180, 150, 80);
        doc.setLineWidth(0.15);
        doc.roundedRect(m + 3.5, offsetY + 3.5, pw - m * 2 - 7, halfH - 7, 1.5, 1.5);

        // Corner ornaments
        const corners = [
          [m + 4, offsetY + 4],
          [pw - m - 4, offsetY + 4],
          [m + 4, offsetY + halfH - 4],
          [pw - m - 4, offsetY + halfH - 4],
        ];
        doc.setDrawColor(140, 100, 40);
        doc.setLineWidth(0.3);
        const ornS = 4;
        for (const [cx, cy] of corners) {
          // L-bracket ornaments instead of '+' crosses
          const isLeft = cx < pw / 2;
          const isTop = cy < offsetY + halfH / 2;
          doc.line(cx, cy, cx + (isLeft ? ornS : -ornS), cy);
          doc.line(cx, cy, cx, cy + (isTop ? ornS : -ornS));
        }

        // Header images
        if (logoImg) doc.addImage(logoImg, "PNG", m + 6, offsetY + 6, 16, 16);
        if (saiImg) doc.addImage(saiImg, "PNG", pw - m - 20, offsetY + 6, 14, 16);

        // Header text
        let y = offsetY + 8;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(20, 20, 140);
        doc.text("Sri Shiradi Sai Educational Trust ®", pw / 2, y, { align: "center" });

        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(10, 10, 10);
        doc.text("HOYSALA DEGREE COLLEGE", pw / 2, y, { align: "center" });

        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(60, 60, 60);
        doc.text("Nelamangala, Bangalore Rural Dist. - 562123 | Affiliated to Bangalore University | Code: BU-26", pw / 2, y, { align: "center" });

        // Gold separator line
        y += 3.5;
        doc.setDrawColor(140, 100, 40);
        doc.setLineWidth(0.6);
        doc.line(m + 25, y, pw - m - 25, y);
        doc.setLineWidth(0.15);
        doc.line(m + 25, y + 1, pw - m - 25, y + 1);

        // HALL TICKET title
        y += 7;
        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.setTextColor(140, 20, 20);
        doc.text("EXAMINATION HALL TICKET", pw / 2, y, { align: "center" });
        const tw = doc.getTextWidth("EXAMINATION HALL TICKET");
        doc.setDrawColor(140, 20, 20);
        doc.setLineWidth(0.4);
        doc.line(pw / 2 - tw / 2 - 2, y + 1.5, pw / 2 + tw / 2 + 2, y + 1.5);

        // Session title
        y += 5.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(selectedSession.title, pw / 2, y, { align: "center" });

        // Student details - side by side layout
        y += 7;
        const leftX = m + 8;
        const rightX = pw / 2 + 5;

        doc.setFontSize(10.5);
        const detailsLeft = [
          { label: "Student Name", value: student.profile?.full_name || "N/A" },
          { label: "Register No.", value: student.roll_number },
          { label: "Course", value: `${courseName} (${courseCode})` },
        ];
        const detailsRight = [
          { label: "Semester", value: student.semester ? `Semester ${student.semester}` : "N/A" },
          { label: "Exam Type", value: selectedSession.exam_type.replace("_", " ").toUpperCase() },
        ];

        let leftY = y;
        for (const d of detailsLeft) {
          doc.setFont("times", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text(`${d.label}:`, leftX, leftY);
          doc.setFont("times", "normal");
          doc.setTextColor(50, 50, 50);
          doc.text(d.value, leftX + 30, leftY);
          leftY += 5.5;
        }

        let rightY = y;
        for (const d of detailsRight) {
          doc.setFont("times", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text(`${d.label}:`, rightX, rightY);
          doc.setFont("times", "normal");
          doc.setTextColor(50, 50, 50);
          doc.text(d.value, rightX + 26, rightY);
          rightY += 5.5;
        }

        y = Math.max(leftY, rightY);

        // Subject table with rounded corners
        y += 2;
        const tableX = m + 8;
        const tableW = pw - m * 2 - 16;
        const col1W = 8;
        const col2W = tableW * 0.32;
        const col3W = tableW * 0.20;
        const col4W = tableW * 0.20;
        const col5W = tableW - col1W - col2W - col3W - col4W;
        const tableH = subjects.length * 7 + 7;
        const cornerR = 2;

        // Table header - subtle warm background instead of dark
        doc.setFillColor(235, 225, 205);
        doc.roundedRect(tableX, y, tableW, 7, cornerR, cornerR, "F");
        doc.rect(tableX, y + 3.5, tableW, 3.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(50, 40, 25);
        doc.text("No.", tableX + 2, y + 5);
        doc.text("Subject", tableX + col1W + 2, y + 5);
        doc.text("Date", tableX + col1W + col2W + 2, y + 5);
        doc.text("Time", tableX + col1W + col2W + col3W + 2, y + 5);
        doc.text("Teacher Sign.", tableX + col1W + col2W + col3W + col4W + 1, y + 5);

        doc.setDrawColor(180, 165, 135);
        doc.line(tableX + col1W, y, tableX + col1W, y + 7);
        doc.line(tableX + col1W + col2W, y, tableX + col1W + col2W, y + 7);
        doc.line(tableX + col1W + col2W + col3W, y, tableX + col1W + col2W + col3W, y + 7);
        doc.line(tableX + col1W + col2W + col3W + col4W, y, tableX + col1W + col2W + col3W + col4W, y + 7);

        y += 7;

        // Table rows
        doc.setFont("times", "normal");
        doc.setFontSize(9.5);
        for (let i = 0; i < subjects.length; i++) {
          const subj = subjects[i];
          const rowH = 7;
          const isLast = i === subjects.length - 1;

          if (i % 2 === 0) {
            doc.setFillColor(252, 250, 245);
          } else {
            doc.setFillColor(245, 240, 230);
          }

          doc.rect(tableX, y, tableW, rowH, "F");

          doc.setTextColor(30, 30, 30);
          doc.text(`${i + 1}`, tableX + 3, y + 5);
          doc.text(subj.subject, tableX + col1W + 2, y + 5);
          doc.text(format(new Date(subj.exam_date), "dd MMM yyyy"), tableX + col1W + col2W + 2, y + 5);
          doc.text(subj.exam_time, tableX + col1W + col2W + col3W + 2, y + 5);

          if (!isLast) {
            doc.setDrawColor(200, 190, 170);
            doc.setLineWidth(0.1);
            doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
          }
          doc.setDrawColor(200, 190, 170);
          doc.setLineWidth(0.1);
          doc.line(tableX + col1W, y, tableX + col1W, y + rowH);
          doc.line(tableX + col1W + col2W, y, tableX + col1W + col2W, y + rowH);
          doc.line(tableX + col1W + col2W + col3W, y, tableX + col1W + col2W + col3W, y + rowH);
          doc.line(tableX + col1W + col2W + col3W + col4W, y, tableX + col1W + col2W + col3W + col4W, y + rowH);
          y += rowH;
        }

        // Outer table rounded border
        const tableStartY = y - (subjects.length * 7 + 7);
        doc.setDrawColor(80, 60, 30);
        doc.setLineWidth(0.3);
        doc.roundedRect(tableX, tableStartY, tableW, subjects.length * 7 + 7, cornerR, cornerR);

        // Instructions
        y += 3;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(100, 100, 100);
        doc.text("* Carry this hall ticket to the exam hall.  * Arrive 15 mins early.  * Electronic devices prohibited.  * Valid only for above examination.", m + 8, y);

        // Signatures - only Student Signature and Principal (removed Exam Controller and College Seal)
        const sigY = offsetY + halfH - 14;
        doc.setDrawColor(80, 60, 30);
        doc.setLineWidth(0.3);

        doc.line(m + 8, sigY, m + 45, sigY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(30, 30, 30);
        doc.text("Student Signature", m + 12, sigY + 4);

        doc.line(pw - m - 45, sigY, pw - m - 8, sigY);
        doc.text("Principal", pw - m - 32, sigY + 4);

        // Cut line
        if (posIndex === 0) {
          const cutY = offsetY + halfH + 2;
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.2);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(m, cutY, pw - m, cutY);
          doc.setLineDashPattern([], 0);
          doc.setFontSize(5);
          doc.setTextColor(180, 180, 180);
          doc.text("Cut here", pw / 2, cutY - 0.5, { align: "center" });
        }

        // Footer
        doc.setFont("helvetica", "italic");
        doc.setFontSize(4.5);
        doc.setTextColor(160, 160, 160);
        doc.text("Computer generated hall ticket - Hoysala Degree College", pw / 2, offsetY + halfH - 4, { align: "center" });
      }

      setGenProgress(98);
      setGenStage("Saving PDF...");

      doc.save(`Hall_Tickets_${selectedSession.title.replace(/\s+/g, "_")}.pdf`);
      setGenProgress(100);
      setGenStage("Done!");
      toast.success(`Generated ${studentList.length} hall ticket(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setGenProgress(0);
        setGenStage("");
      }, 400);
    }
  };

  const filteredStudents = students.filter(s => {
    if (filterCourse !== "all" && s.course_id !== filterCourse) return false;
    if (filterSemester !== "all" && String(s.semester) !== filterSemester) return false;
    if (filterYear !== "all") {
      const yearLevel = Math.ceil((s.semester || 1) / 2);
      if (String(yearLevel) !== filterYear) return false;
    }
    return true;
  });

  return (
    <>
      <SEOHead title="Hall Tickets | Admin" description="Manage exam hall tickets" noIndex />
      <div className="space-y-6 animate-fade-in">
        {/* Premium iOS-style Hero Header */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 p-7 shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)]">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-[hsl(var(--gold))]/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          {/* Specular top edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 blur-xl" />
                <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6),inset_0_1px_0_rgba(255,255,255,0.25)]">
                  <Ticket className="w-7 h-7 text-primary-foreground" strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-primary">Admin Suite</span>
                </div>
                <h2 className="text-[1.65rem] sm:text-3xl font-bold tracking-tight text-foreground leading-tight">Exam Hall Tickets</h2>
                <p className="text-sm text-muted-foreground mt-1">Create sessions · configure subjects · generate premium PDFs</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="group h-12 px-5 gap-2 rounded-2xl bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.7)] transition-all duration-300 active:scale-[0.97]">
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                  <span className="font-semibold">New Exam Session</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-border/60 sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 rounded-xl bg-primary/10"><Sparkles className="w-4 h-4 text-primary" /></div>
                    Create Exam Session
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Title *</Label>
                    <Input placeholder="e.g. Semester 3 Internal Exam — Jan 2026" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-11 rounded-xl border-border/60" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</Label>
                      <Select value={newCourseId} onValueChange={setNewCourseId}>
                        <SelectTrigger className="h-11 rounded-xl border-border/60"><SelectValue placeholder="All courses" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all_courses">All Courses</SelectItem>
                          {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semester</Label>
                      <Select value={newSemester} onValueChange={setNewSemester}>
                        <SelectTrigger className="h-11 rounded-xl border-border/60"><SelectValue placeholder="All semesters" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all_sem">All Semesters</SelectItem>
                          {[1,2,3,4,5,6].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exam Type</Label>
                    <Select value={newExamType} onValueChange={setNewExamType}>
                      <SelectTrigger className="h-11 rounded-xl border-border/60"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="semester">Semester</SelectItem>
                        <SelectItem value="supplementary">Supplementary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createSession} className="w-full h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6),inset_0_1px_0_rgba(255,255,255,0.25)] active:scale-[0.98] transition-transform font-semibold">
                    Create Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick stats strip */}
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: FileText, label: "Sessions", value: sessions.length, tint: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-500" },
              { icon: BookOpen, label: "Subjects", value: subjects.length, tint: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
              { icon: Users, label: "Students", value: students.length, tint: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
            ].map((stat, i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 backdrop-blur-xl p-3.5 hover:border-border transition-all">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.tint} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-background border border-border/60 ${stat.iconColor}`}>
                    <stat.icon className="w-4 h-4" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground tabular-nums leading-tight">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Overlay */}
        {generating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md animate-fade-in">
            <div className="relative bg-card/95 backdrop-blur-2xl border border-border/60 rounded-3xl p-8 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)] max-w-md w-full mx-4 text-center space-y-6 animate-scale-in">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/40 to-primary/10 blur-2xl animate-pulse" />
                <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.6),inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Printer className="w-9 h-9 text-primary-foreground animate-pulse" strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Generating Hall Tickets</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{genStage}</p>
              </div>
              <div className="space-y-2.5">
                <Progress value={genProgress} className="h-2.5 rounded-full" />
                <p className="text-xs font-semibold text-primary tabular-nums">{genProgress}% complete</p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="sessions" className="space-y-5">
          <TabsList className="rounded-2xl bg-muted/60 backdrop-blur-xl p-1 h-12 border border-border/40">
            <TabsTrigger value="sessions" className="rounded-xl gap-2 h-10 px-5 font-semibold data-[state=active]:bg-card data-[state=active]:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] transition-all">
              <FileText className="w-4 h-4" /> Exam Sessions
            </TabsTrigger>
            <TabsTrigger value="configure" disabled={!selectedSession} className="rounded-xl gap-2 h-10 px-5 font-semibold data-[state=active]:bg-card data-[state=active]:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] transition-all">
              <Sparkles className="w-4 h-4" /> Configure & Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="animate-fade-in">
            <Card className="rounded-3xl border-border/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent">
                <CardTitle className="text-lg flex items-center gap-2.5 tracking-tight">
                  <div className="p-1.5 rounded-lg bg-primary/10"><Calendar className="w-4 h-4 text-primary" strokeWidth={2.2} /></div>
                  All Sessions
                </CardTitle>
                <CardDescription>Select a session to configure subjects and generate hall tickets</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sessions.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <Ticket className="w-8 h-8 text-muted-foreground/40" strokeWidth={1.8} />
                    </div>
                    <p className="font-semibold text-foreground">No exam sessions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Create your first session to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/40">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Title</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Course</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Semester</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Type</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Created</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map(s => (
                        <TableRow key={s.id} className={`transition-all border-border/40 ${selectedSession?.id === s.id ? "bg-primary/[0.06] border-l-[3px] border-l-primary" : "hover:bg-muted/30"}`}>
                          <TableCell className="font-semibold text-foreground">{s.title}</TableCell>
                          <TableCell className="text-sm">{courses.find(c => c.id === s.course_id)?.name || <span className="text-muted-foreground italic">All</span>}</TableCell>
                          <TableCell>{s.semester ? <Badge variant="outline" className="rounded-lg font-mono">Sem {s.semester}</Badge> : <span className="text-muted-foreground italic text-sm">All</span>}</TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize rounded-lg font-medium">{s.exam_type}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm tabular-nums">{format(new Date(s.created_at), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant={selectedSession?.id === s.id ? "default" : "outline"} className="rounded-xl h-9 transition-all active:scale-95" onClick={() => setSelectedSession(s)}>
                                <FileText className="w-3.5 h-3.5 mr-1.5" /> Configure
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-xl h-9 w-9 p-0 active:scale-95" onClick={() => deleteSession(s.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configure" className="animate-fade-in">
            {selectedSession && (
              <div className="space-y-5">
                {/* Session info banner */}
                <div className="relative overflow-hidden flex items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.5),inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <BookOpen className="w-5 h-5 text-primary-foreground" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{selectedSession.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {courses.find(c => c.id === selectedSession.course_id)?.name || "All Courses"} · {selectedSession.semester ? `Semester ${selectedSession.semester}` : "All Semesters"} · <span className="capitalize">{selectedSession.exam_type}</span>
                    </p>
                  </div>
                  <Badge className="rounded-xl bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 font-semibold px-3 py-1">{subjects.length} subjects</Badge>
                </div>

                {/* Add subjects form */}
                <Card className="rounded-3xl border-border/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
                  <CardHeader className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent">
                    <CardTitle className="text-lg flex items-center gap-2.5 tracking-tight">
                      <div className="p-1.5 rounded-lg bg-amber-500/10"><BookOpen className="w-4 h-4 text-amber-500" strokeWidth={2.2} /></div>
                      Subjects & Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject Name</Label>
                        <Input placeholder="e.g. Mathematics" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="h-11 rounded-xl border-border/60" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exam Date</Label>
                        <Input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="h-11 rounded-xl border-border/60" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exam Time</Label>
                        <Input placeholder="10:00 AM - 1:00 PM" value={newExamTime} onChange={e => setNewExamTime(e.target.value)} className="h-11 rounded-xl border-border/60" />
                      </div>
                      <Button onClick={addSubject} className="h-11 gap-2 rounded-xl bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.6),inset_0_1px_0_rgba(255,255,255,0.25)] active:scale-[0.97] font-semibold">
                        <Plus className="w-4 h-4" /> Add
                      </Button>
                    </div>

                    {subjects.length > 0 && (
                      <div className="border border-border/60 rounded-2xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/40">
                              <TableHead className="w-12 font-semibold text-xs uppercase tracking-wider">S.No</TableHead>
                              <TableHead className="font-semibold text-xs uppercase tracking-wider">Subject</TableHead>
                              <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                              <TableHead className="font-semibold text-xs uppercase tracking-wider">Time</TableHead>
                              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subjects.map((sub, i) => (
                              <TableRow key={sub.id} className="border-border/40 hover:bg-muted/20 transition-colors">
                                <TableCell className="font-medium text-muted-foreground tabular-nums">{i + 1}</TableCell>
                                <TableCell className="font-semibold">{sub.subject}</TableCell>
                                <TableCell className="tabular-nums">{format(new Date(sub.exam_date), "dd MMM yyyy")}</TableCell>
                                <TableCell><Badge variant="outline" className="rounded-lg font-mono text-[11px]"><Clock className="w-3 h-3 mr-1" />{sub.exam_time}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-xl h-9 w-9 p-0 active:scale-95" onClick={() => removeSubject(sub.id)}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Generate section */}
                <Card className="rounded-3xl border-border/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
                  <CardHeader className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent">
                    <CardTitle className="text-lg flex items-center gap-2.5 tracking-tight">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10"><Printer className="w-4 h-4 text-emerald-500" strokeWidth={2.2} /></div>
                      Generate Hall Tickets
                    </CardTitle>
                    <CardDescription>Filter students and generate premium hall ticket PDFs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end p-5 bg-gradient-to-br from-muted/40 to-muted/10 rounded-2xl border border-border/40">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</Label>
                        <Select value={filterCourse} onValueChange={setFilterCourse}>
                          <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background"><SelectValue placeholder="All courses" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semester</Label>
                        <Select value={filterSemester} onValueChange={setFilterSemester}>
                          <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background"><SelectValue placeholder="All semesters" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Semesters</SelectItem>
                            {[1,2,3,4,5,6].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Year</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background"><SelectValue placeholder="All years" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Years</SelectItem>
                            {[1,2,3].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl bg-background/80 border border-border/60 backdrop-blur-sm">
                        <div className="p-1.5 rounded-lg bg-primary/10"><Users className="w-3.5 h-3.5 text-primary" strokeWidth={2.4} /></div>
                        <div className="leading-tight">
                          <span className="font-bold text-foreground tabular-nums">{filteredStudents.length}</span>
                          <span className="text-muted-foreground text-xs ml-1">students</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => generateHallTicketPDF(filteredStudents)} disabled={generating || subjects.length === 0} className="group h-12 px-6 gap-2 rounded-2xl bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.7)] active:scale-[0.97] transition-all font-semibold">
                        <Download className="w-4 h-4 transition-transform group-hover:translate-y-0.5 duration-200" />
                        {generating ? "Generating..." : `Generate All (${filteredStudents.length})`}
                      </Button>
                    </div>

                    {filteredStudents.length > 0 && (
                      <div className="max-h-72 overflow-auto border border-border/60 rounded-2xl">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-card">
                            <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/40">
                              <TableHead className="font-semibold text-xs uppercase tracking-wider">Name</TableHead>
                              <TableHead className="font-semibold text-xs uppercase tracking-wider">Roll Number</TableHead>
                              <TableHead className="font-semibold text-xs uppercase tracking-wider">Course</TableHead>
                              <TableHead className="font-semibold text-xs uppercase tracking-wider">Sem</TableHead>
                              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Individual</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStudents.map(s => (
                              <TableRow key={s.id} className="hover:bg-muted/30 border-border/40 transition-colors">
                                <TableCell className="font-semibold">{s.profile?.full_name || "N/A"}</TableCell>
                                <TableCell><Badge variant="outline" className="rounded-lg font-mono text-xs">{s.roll_number}</Badge></TableCell>
                                <TableCell className="text-sm">{s.course?.name || "N/A"}</TableCell>
                                <TableCell className="tabular-nums">{s.semester || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="ghost" className="rounded-xl h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary active:scale-95" onClick={() => generateHallTicketPDF([s])} disabled={generating}>
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
