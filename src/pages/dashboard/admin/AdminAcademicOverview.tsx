import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, Search, GraduationCap, UserCheck, UserX, Sparkles, TrendingUp, Eye, BarChart3, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";

interface AcademicYear {
  id: string;
  label: string;
  is_current: boolean | null;
  start_date: string | null;
  end_date: string | null;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface StudentRow {
  id: string;
  roll_number: string;
  semester: number | null;
  is_active: boolean | null;
  gender: string | null;
  admission_year: number | null;
  course_id: string | null;
  user_id: string;
  profile: { full_name: string; email: string; phone: string | null } | null;
  course: { name: string; code: string } | null;
}

export default function AdminAcademicOverview() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAcademicYears();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedYear) fetchStudents();
  }, [selectedYear]);

  const fetchAcademicYears = async () => {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .order("label", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load academic years", variant: "destructive" });
      return;
    }
    setAcademicYears(data || []);
    const current = data?.find((y) => y.is_current);
    if (current) setSelectedYear(current.id);
    else if (data?.length) setSelectedYear(data[0].id);
    setLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("id, name, code").eq("is_active", true).order("name");
    setCourses(data || []);
  };

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, roll_number, semester, is_active, gender, admission_year, course_id, academic_year_id, user_id")
      .eq("academic_year_id", selectedYear);

    if (error) {
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!data?.length) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const userIds = data.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const courseIds = [...new Set(data.map((s) => s.course_id).filter(Boolean))];
    const { data: courseData } = await supabase
      .from("courses")
      .select("id, name, code")
      .in("id", courseIds as string[]);
    const courseMap = new Map((courseData || []).map((c) => [c.id, c]));

    const mapped: StudentRow[] = data.map((s) => ({
      id: s.id,
      roll_number: s.roll_number,
      semester: s.semester,
      is_active: s.is_active,
      gender: s.gender,
      admission_year: s.admission_year,
      course_id: s.course_id,
      user_id: s.user_id,
      profile: profileMap.get(s.user_id) || null,
      course: s.course_id ? courseMap.get(s.course_id) || null : null,
    }));

    setStudents(mapped);
    setLoading(false);
  };

  const filteredStudents = students.filter((s) => {
    if (selectedCourse !== "all" && s.course_id !== selectedCourse) return false;
    if (selectedSemester !== "all" && String(s.semester) !== selectedSemester) return false;
    if (selectedStatus === "active" && !s.is_active) return false;
    if (selectedStatus === "inactive" && s.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.profile?.full_name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.profile?.email?.toLowerCase().includes(q) ||
        s.course?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCourseCounts = (courseId: string) => {
    const courseStudents = students.filter((s) => s.course_id === courseId);
    return {
      total: courseStudents.length,
      active: courseStudents.filter((s) => s.is_active).length,
      male: courseStudents.filter((s) => s.gender?.toLowerCase() === "male").length,
      female: courseStudents.filter((s) => s.gender?.toLowerCase() === "female").length,
    };
  };

  const totalActive = students.filter((s) => s.is_active).length;
  const totalInactive = students.filter((s) => !s.is_active).length;
  const totalMale = students.filter((s) => s.gender?.toLowerCase() === "male").length;
  const totalFemale = students.filter((s) => s.gender?.toLowerCase() === "female").length;
  const activeCourses = new Set(students.map((s) => s.course_id).filter(Boolean)).size;

  return (
    <>
      <SEOHead title="Academic Overview | Admin" description="Academic year overview" noIndex />
      <div className="space-y-6">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-border rounded-2xl p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Academic Year Overview</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Comprehensive enrollment analytics by academic year and course</p>
            </div>
          </div>
        </div>

        {/* Academic Year Tabs */}
        {academicYears.length > 0 && (
          <Tabs value={selectedYear} onValueChange={setSelectedYear}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
              {academicYears.map((y) => (
                <TabsTrigger key={y.id} value={y.id} className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-md">
                  {y.label}
                  {y.is_current && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 rounded-md bg-primary/10 text-primary">Current</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Students", value: students.length, icon: Users, color: "primary", bg: "primary" },
            { label: "Active", value: totalActive, icon: UserCheck, color: "text-emerald-500", bg: "emerald-500" },
            { label: "Inactive", value: totalInactive, icon: UserX, color: "text-destructive", bg: "destructive" },
            { label: "Male", value: totalMale, icon: TrendingUp, color: "text-blue-500", bg: "blue-500" },
            { label: "Female", value: totalFemale, icon: Sparkles, color: "text-pink-500", bg: "pink-500" },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-${stat.bg}/10`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Course-wise Breakdown */}
        <Card className="rounded-2xl border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Course-wise Enrollment
            </CardTitle>
            <CardDescription>Click a course card to filter the student list below</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const counts = getCourseCounts(course.id);
                  if (counts.total === 0) return null;
                  const pct = students.length > 0 ? Math.round((counts.total / students.length) * 100) : 0;
                  return (
                    <Card
                      key={course.id}
                      className={`cursor-pointer transition-all hover:shadow-lg rounded-xl ${
                        selectedCourse === course.id ? "ring-2 ring-primary shadow-lg" : "border-border/60"
                      }`}
                      onClick={() => setSelectedCourse(selectedCourse === course.id ? "all" : course.id)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{course.name}</p>
                            <p className="text-xs text-muted-foreground">{course.code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">{counts.total}</p>
                            <p className="text-[10px] text-muted-foreground">{pct}% of total</p>
                          </div>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Active: {counts.active}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" /> M: {counts.male}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-pink-500" /> F: {counts.female}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {courses.every((c) => getCourseCounts(c.id).total === 0) && (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    No students enrolled for this academic year.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student List */}
        <Card className="rounded-2xl border-border/60 shadow-lg">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Student Directory
                    {selectedCourse !== "all" && (
                      <Badge variant="outline" className="ml-2 cursor-pointer rounded-lg" onClick={() => setSelectedCourse("all")}>
                        {courses.find((c) => c.id === selectedCourse)?.name} ✕
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">Click any student to view their full profile</CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, roll number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/40">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="w-36 rounded-lg h-8 text-xs"><SelectValue placeholder="Semester" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {[1,2,3,4,5,6].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32 rounded-lg h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground ml-auto">
                  Showing <span className="font-semibold text-foreground">{filteredStudents.length}</span> of {students.length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-muted-foreground">No students found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border/60 rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s, i) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => navigate(`/dashboard/admin/users/${s.user_id}`)}
                      >
                        <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-semibold">{s.profile?.full_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="rounded-lg font-mono text-xs">{s.roll_number}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-lg">{s.course?.code || "—"}</Badge>
                        </TableCell>
                        <TableCell>{s.semester || "—"}</TableCell>
                        <TableCell className="capitalize">{s.gender || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? "default" : "secondary"} className="rounded-lg">
                            {s.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/admin/users/${s.user_id}`);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
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
    </>
  );
}
