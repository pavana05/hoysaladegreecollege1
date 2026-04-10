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
        const tableStartY = y - (subjects.length * 5 + 6);
        doc.setDrawColor(80, 60, 30);
        doc.setLineWidth(0.3);
        doc.roundedRect(tableX, tableStartY, tableW, tableH, cornerR, cornerR);

        // Instructions
        y += 3;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(100, 100, 100);
        doc.text("* Carry this hall ticket to the exam hall.  * Arrive 15 mins early.  * Electronic devices prohibited.  * Valid only for above examination.", m + 8, y);

        // Signatures
        const sigY = offsetY + halfH - 14;
        doc.setDrawColor(80, 60, 30);
        doc.setLineWidth(0.3);

        doc.line(m + 8, sigY, m + 45, sigY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(30, 30, 30);
        doc.text("Student Signature", m + 12, sigY + 4);

        doc.line(pw / 2 - 15, sigY, pw / 2 + 20, sigY);
        doc.text("Exam Controller", pw / 2 - 8, sigY + 4);

        doc.line(pw - m - 45, sigY, pw - m - 8, sigY);
        doc.text("Principal", pw - m - 32, sigY + 4);

        // College seal
        doc.setDrawColor(140, 100, 40);
        doc.setLineWidth(0.3);
        doc.circle(pw / 2, sigY - 8, 7);
        doc.circle(pw / 2, sigY - 8, 6);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(4.5);
        doc.setTextColor(140, 100, 40);
        doc.text("College Seal", pw / 2, sigY - 8, { align: "center" });

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
      <div className="space-y-6">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-border rounded-2xl p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Exam Hall Tickets</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Create sessions, configure subjects & generate premium hall tickets</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl shadow-lg"><Plus className="w-4 h-4" /> New Exam Session</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>Create Exam Session</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Session Title *</Label>
                    <Input placeholder="e.g. Semester 3 Internal Exam - Jan 2026" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Course (optional)</Label>
                      <Select value={newCourseId} onValueChange={setNewCourseId}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="All courses" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_courses">All Courses</SelectItem>
                          {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Semester (optional)</Label>
                      <Select value={newSemester} onValueChange={setNewSemester}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="All semesters" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_sem">All Semesters</SelectItem>
                          {[1,2,3,4,5,6].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Exam Type</Label>
                    <Select value={newExamType} onValueChange={setNewExamType}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="semester">Semester</SelectItem>
                        <SelectItem value="supplementary">Supplementary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createSession} className="w-full rounded-xl">Create Session</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Progress Overlay */}
        {generating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Printer className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Generating Hall Tickets</h3>
                <p className="text-sm text-muted-foreground mt-1">{genStage}</p>
              </div>
              <div className="space-y-2">
                <Progress value={genProgress} className="h-3" />
                <p className="text-xs font-medium text-primary">{genProgress}% complete</p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="sessions" className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <FileText className="w-4 h-4" /> Exam Sessions
            </TabsTrigger>
            <TabsTrigger value="configure" disabled={!selectedSession} className="rounded-lg gap-2 data-[state=active]:shadow-md">
              <Sparkles className="w-4 h-4" /> Configure & Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <Card className="rounded-2xl border-border/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> All Sessions
                </CardTitle>
                <CardDescription>Select a session to configure subjects and generate hall tickets</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Title</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Ticket className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                        No exam sessions created yet
                      </TableCell></TableRow>
                    ) : sessions.map(s => (
                      <TableRow key={s.id} className={`transition-colors ${selectedSession?.id === s.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"}`}>
                        <TableCell className="font-semibold">{s.title}</TableCell>
                        <TableCell>{courses.find(c => c.id === s.course_id)?.name || <span className="text-muted-foreground">All</span>}</TableCell>
                        <TableCell>{s.semester ? <Badge variant="outline" className="rounded-lg">Sem {s.semester}</Badge> : <span className="text-muted-foreground">All</span>}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize rounded-lg">{s.exam_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(s.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant={selectedSession?.id === s.id ? "default" : "outline"} className="rounded-lg" onClick={() => setSelectedSession(s)}>
                              <FileText className="w-3.5 h-3.5 mr-1" /> Configure
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive rounded-lg" onClick={() => deleteSession(s.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configure">
            {selectedSession && (
              <div className="space-y-6">
                {/* Session info badge */}
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{selectedSession.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {courses.find(c => c.id === selectedSession.course_id)?.name || "All Courses"} · {selectedSession.semester ? `Semester ${selectedSession.semester}` : "All Semesters"} · <span className="capitalize">{selectedSession.exam_type}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-lg">{subjects.length} subjects</Badge>
                </div>

                {/* Add subjects form */}
                <Card className="rounded-2xl border-border/60 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Subjects & Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <Label>Subject Name</Label>
                        <Input placeholder="e.g. Mathematics" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <Label>Exam Date</Label>
                        <Input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <Label>Exam Time</Label>
                        <Input placeholder="10:00 AM - 1:00 PM" value={newExamTime} onChange={e => setNewExamTime(e.target.value)} className="rounded-xl" />
                      </div>
                      <Button onClick={addSubject} className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> Add</Button>
                    </div>

                    {subjects.length > 0 && (
                      <div className="border border-border/60 rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="w-12">S.No</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subjects.map((sub, i) => (
                              <TableRow key={sub.id}>
                                <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                                <TableCell className="font-semibold">{sub.subject}</TableCell>
                                <TableCell>{format(new Date(sub.exam_date), "dd MMM yyyy")}</TableCell>
                                <TableCell><Badge variant="outline" className="rounded-lg"><Clock className="w-3 h-3 mr-1" />{sub.exam_time}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="ghost" className="text-destructive rounded-lg" onClick={() => removeSubject(sub.id)}>
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
                <Card className="rounded-2xl border-border/60 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Printer className="w-5 h-5 text-primary" />
                      Generate Hall Tickets
                    </CardTitle>
                    <CardDescription>Filter students and generate premium hall ticket PDFs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end p-4 bg-muted/20 rounded-xl border border-border/40">
                      <div>
                        <Label className="text-xs text-muted-foreground">Filter by Course</Label>
                        <Select value={filterCourse} onValueChange={setFilterCourse}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="All courses" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Filter by Semester</Label>
                        <Select value={filterSemester} onValueChange={setFilterSemester}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="All semesters" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Semesters</SelectItem>
                            {[1,2,3,4,5,6].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Filter by Year</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="All years" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {[1,2,3].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{filteredStudents.length}</span>
                        <span className="text-muted-foreground">student(s)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => generateHallTicketPDF(filteredStudents)} disabled={generating || subjects.length === 0} className="gap-2 rounded-xl shadow-lg">
                        <Download className="w-4 h-4" />
                        {generating ? "Generating..." : `Generate All (${filteredStudents.length})`}
                      </Button>
                    </div>

                    {filteredStudents.length > 0 && (
                      <div className="max-h-60 overflow-auto border border-border/60 rounded-xl">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead>Name</TableHead>
                              <TableHead>Roll Number</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Sem</TableHead>
                              <TableHead className="text-right">Individual</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStudents.map(s => (
                              <TableRow key={s.id} className="hover:bg-muted/30">
                                <TableCell className="font-semibold">{s.profile?.full_name || "N/A"}</TableCell>
                                <TableCell><Badge variant="outline" className="rounded-lg font-mono text-xs">{s.roll_number}</Badge></TableCell>
                                <TableCell>{s.course?.name || "N/A"}</TableCell>
                                <TableCell>{s.semester || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => generateHallTicketPDF([s])} disabled={generating}>
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
