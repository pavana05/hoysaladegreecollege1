import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Download, Printer, Calendar, BookOpen, X } from "lucide-react";
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
      // Fetch profiles and courses for each student
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
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = 210, ph = 297, m = 12;

      let [logoImg, saiImg] = [null as HTMLImageElement | null, null as HTMLImageElement | null];
      try {
        [logoImg, saiImg] = await Promise.all([loadImage(collegeLogo), loadImage(saiBabaImg)]);
      } catch {}

      for (let si = 0; si < studentList.length; si++) {
        if (si > 0) doc.addPage();
        const student = studentList[si];
        const courseName = student.course?.name || "N/A";
        const courseCode = student.course?.code || "";

        // Border
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(1);
        doc.rect(m, m, pw - m * 2, ph - m * 2);
        doc.setDrawColor(140, 100, 40);
        doc.setLineWidth(0.3);
        doc.rect(m + 2, m + 2, pw - m * 2 - 4, ph - m * 2 - 4);

        // Header images
        if (logoImg) doc.addImage(logoImg, "PNG", m + 6, m + 6, 22, 22);
        if (saiImg) doc.addImage(saiImg, "PNG", pw - m - 28, m + 6, 22, 22);

        // Header text
        let y = m + 10;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 140);
        doc.text("Sri Shiradi Sai Educational Trust ®", pw / 2, y, { align: "center" });

        y += 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(10, 10, 10);
        doc.text("HOYSALA DEGREE COLLEGE", pw / 2, y, { align: "center" });

        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(50, 50, 50);
        doc.text("Nelamangala, Bangalore Rural Dist. - 562123", pw / 2, y, { align: "center" });
        y += 3.5;
        doc.text("Affiliated to Bangalore University | College Code: BU-26", pw / 2, y, { align: "center" });

        // Separator
        y += 5;
        doc.setDrawColor(140, 100, 40);
        doc.setLineWidth(0.5);
        doc.line(m + 10, y, pw - m - 10, y);

        // HALL TICKET title
        y += 10;
        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.setTextColor(10, 10, 10);
        doc.text("EXAMINATION HALL TICKET", pw / 2, y, { align: "center" });
        const tw = doc.getTextWidth("EXAMINATION HALL TICKET");
        doc.setDrawColor(10, 10, 10);
        doc.setLineWidth(0.6);
        doc.line(pw / 2 - tw / 2, y + 2, pw / 2 + tw / 2, y + 2);

        // Session title
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(140, 20, 20);
        doc.text(selectedSession.title, pw / 2, y, { align: "center" });

        // Student details
        y += 12;
        const detailsStartY = y;
        const labelX = m + 10;
        const valueX = m + 55;

        const details = [
          { label: "Student Name", value: student.profile?.full_name || "N/A" },
          { label: "Register Number", value: student.roll_number },
          { label: "Course", value: `${courseName} (${courseCode})` },
          { label: "Semester", value: student.semester ? `Semester ${student.semester}` : "N/A" },
          { label: "Exam Type", value: selectedSession.exam_type.replace("_", " ").toUpperCase() },
        ];

        doc.setFontSize(10.5);
        for (const d of details) {
          doc.setFont("times", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text(`${d.label}:`, labelX, y);
          doc.setFont("times", "normal");
          doc.setTextColor(50, 50, 50);
          doc.text(d.value, valueX, y);
          y += 7;
        }

        // Photo placeholder on the right
        const photoX = pw - m - 35;
        const photoY = detailsStartY - 2;
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.rect(photoX, photoY, 25, 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Photo", photoX + 12.5, photoY + 17, { align: "center" });

        // Subject table
        y += 6;
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.4);
        
        const tableX = m + 10;
        const tableW = pw - m * 2 - 20;
        const col1W = 10; // S.No
        const col2W = tableW * 0.42; // Subject
        const col3W = tableW * 0.28; // Date
        const col4W = tableW - col1W - col2W - col3W; // Time

        // Table header
        doc.setFillColor(240, 235, 225);
        doc.rect(tableX, y, tableW, 8, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(10, 10, 10);
        doc.text("No.", tableX + 2, y + 5.5);
        doc.text("Subject", tableX + col1W + 3, y + 5.5);
        doc.text("Date", tableX + col1W + col2W + 3, y + 5.5);
        doc.text("Time", tableX + col1W + col2W + col3W + 3, y + 5.5);

        // Vertical lines for header
        doc.line(tableX + col1W, y, tableX + col1W, y + 8);
        doc.line(tableX + col1W + col2W, y, tableX + col1W + col2W, y + 8);
        doc.line(tableX + col1W + col2W + col3W, y, tableX + col1W + col2W + col3W, y + 8);

        y += 8;

        // Table rows
        doc.setFont("times", "normal");
        doc.setFontSize(9.5);
        for (let i = 0; i < subjects.length; i++) {
          const subj = subjects[i];
          const rowH = 7.5;
          if (i % 2 === 0) {
            doc.setFillColor(252, 250, 248);
            doc.rect(tableX, y, tableW, rowH, "F");
          }
          doc.setTextColor(30, 30, 30);
          doc.text(`${i + 1}`, tableX + 4, y + 5);
          doc.text(subj.subject, tableX + col1W + 3, y + 5);
          doc.text(format(new Date(subj.exam_date), "dd MMM yyyy"), tableX + col1W + col2W + 3, y + 5);
          doc.text(subj.exam_time, tableX + col1W + col2W + col3W + 3, y + 5);

          // Row border
          doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
          // Vertical lines
          doc.line(tableX + col1W, y, tableX + col1W, y + rowH);
          doc.line(tableX + col1W + col2W, y, tableX + col1W + col2W, y + rowH);
          doc.line(tableX + col1W + col2W + col3W, y, tableX + col1W + col2W + col3W, y + rowH);

          y += rowH;
        }

        // Outer table border
        const tableEndY = y;
        doc.rect(tableX, tableEndY - (subjects.length * 7.5 + 8), tableW, subjects.length * 7.5 + 8);

        // Instructions
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(10, 10, 10);
        doc.text("Instructions:", m + 10, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const instructions = [
          "1. Students must carry this hall ticket to the exam hall.",
          "2. Arrive at least 15 minutes before the exam.",
          "3. Electronic devices are strictly prohibited inside the exam hall.",
          "4. This hall ticket is valid only for the above mentioned examination."
        ];
        for (const inst of instructions) {
          doc.text(inst, m + 10, y);
          y += 5;
        }

        // Signatures
        const sigY = ph - m - 25;
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.3);
        
        doc.line(m + 10, sigY, m + 55, sigY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        doc.text("Student Signature", m + 15, sigY + 5);

        doc.line(pw / 2 - 20, sigY, pw / 2 + 25, sigY);
        doc.text("Exam Controller", pw / 2 - 10, sigY + 5);

        doc.line(pw - m - 55, sigY, pw - m - 10, sigY);
        doc.text("Principal", pw - m - 40, sigY + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Hoysala Degree College", pw - m - 47, sigY + 10);

        // College seal placeholder
        doc.setDrawColor(180, 150, 80);
        doc.setLineWidth(0.3);
        doc.circle(pw / 2, sigY - 10, 12);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(180, 150, 80);
        doc.text("College Seal", pw / 2, sigY - 10, { align: "center" });

        // Footer
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(130, 130, 130);
        doc.text("Computer generated hall ticket. For verification, contact the college office.", pw / 2, ph - m - 4, { align: "center" });
      }

      doc.save(`Hall_Tickets_${selectedSession.title.replace(/\s+/g, "_")}.pdf`);
      toast.success(`Generated ${studentList.length} hall ticket(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const filteredStudents = filterCourse === "all" ? students : students.filter(s => s.course_id === filterCourse);

  return (
    <>
      <SEOHead title="Hall Tickets | Admin" noIndex />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Exam Hall Tickets</h2>
            <p className="text-sm text-muted-foreground mt-1">Create exam sessions, add subjects & dates, then generate hall tickets in bulk</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Exam Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Exam Session</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Session Title *</Label>
                  <Input placeholder="e.g. Semester 3 Internal Exam - Jan 2026" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Course (optional)</Label>
                    <Select value={newCourseId} onValueChange={setNewCourseId}>
                      <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_courses">All Courses</SelectItem>
                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Semester (optional)</Label>
                    <Select value={newSemester} onValueChange={setNewSemester}>
                      <SelectTrigger><SelectValue placeholder="All semesters" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="semester">Semester</SelectItem>
                      <SelectItem value="supplementary">Supplementary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createSession} className="w-full">Create Session</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions">Exam Sessions</TabsTrigger>
            <TabsTrigger value="configure" disabled={!selectedSession}>Configure & Generate</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No exam sessions created yet</TableCell></TableRow>
                    ) : sessions.map(s => (
                      <TableRow key={s.id} className={selectedSession?.id === s.id ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell>{courses.find(c => c.id === s.course_id)?.name || "All"}</TableCell>
                        <TableCell>{s.semester ? `Sem ${s.semester}` : "All"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{s.exam_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(s.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant={selectedSession?.id === s.id ? "default" : "outline"} onClick={() => setSelectedSession(s)}>
                              <FileText className="w-3.5 h-3.5 mr-1" /> Configure
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSession(s.id)}>
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
                {/* Add subjects form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Subjects & Schedule — {selectedSession.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <Label>Subject Name</Label>
                        <Input placeholder="e.g. Mathematics" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                      </div>
                      <div>
                        <Label>Exam Date</Label>
                        <Input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Exam Time</Label>
                        <Input placeholder="10:00 AM - 1:00 PM" value={newExamTime} onChange={e => setNewExamTime(e.target.value)} />
                      </div>
                      <Button onClick={addSubject} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
                    </div>

                    {subjects.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S.No</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjects.map((sub, i) => (
                            <TableRow key={sub.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">{sub.subject}</TableCell>
                              <TableCell>{format(new Date(sub.exam_date), "dd MMM yyyy")}</TableCell>
                              <TableCell>{sub.exam_time}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeSubject(sub.id)}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Generate section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Printer className="w-5 h-5 text-primary" />
                      Generate Hall Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <Label>Filter by Course</Label>
                        <Select value={filterCourse} onValueChange={setFilterCourse}>
                          <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {filteredStudents.length} student(s) found
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => generateHallTicketPDF(filteredStudents)} disabled={generating || subjects.length === 0} className="gap-2">
                        <Download className="w-4 h-4" />
                        {generating ? "Generating..." : `Generate All (${filteredStudents.length})`}
                      </Button>
                    </div>

                    {/* Preview student list */}
                    {filteredStudents.length > 0 && (
                      <div className="max-h-60 overflow-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Roll Number</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Sem</TableHead>
                              <TableHead className="text-right">Individual</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStudents.map(s => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.profile?.full_name || "N/A"}</TableCell>
                                <TableCell>{s.roll_number}</TableCell>
                                <TableCell>{s.course?.name || "N/A"}</TableCell>
                                <TableCell>{s.semester || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="ghost" onClick={() => generateHallTicketPDF([s])} disabled={generating}>
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
