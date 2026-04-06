import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, BookOpen, Search, GraduationCap, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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

    // Fetch profiles for these students
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
      profile: profileMap.get(s.user_id) || null,
      course: s.course_id ? courseMap.get(s.course_id) || null : null,
    }));

    setStudents(mapped);
    setLoading(false);
  };

  const filteredStudents = students.filter((s) => {
    if (selectedCourse !== "all" && s.course?.code !== selectedCourse && s.course?.id !== selectedCourse) return false;
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
    const courseStudents = students.filter((s) => s.course?.id === courseId || (!courseId && !s.course));
    return {
      total: courseStudents.length,
      active: courseStudents.filter((s) => s.is_active).length,
      male: courseStudents.filter((s) => s.gender?.toLowerCase() === "male").length,
      female: courseStudents.filter((s) => s.gender?.toLowerCase() === "female").length,
    };
  };

  const totalActive = students.filter((s) => s.is_active).length;
  const totalInactive = students.filter((s) => !s.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Academic Year Overview</h1>
        <p className="text-muted-foreground">View enrolled students by academic year and course</p>
      </div>

      {/* Academic Year Tabs */}
      {academicYears.length > 0 && (
        <Tabs value={selectedYear} onValueChange={setSelectedYear}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {academicYears.map((y) => (
              <TabsTrigger key={y.id} value={y.id} className="text-xs sm:text-sm">
                {y.label}
                {y.is_current && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1">Current</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{students.length}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalActive}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalInactive}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(students.map((s) => s.course?.id).filter(Boolean)).size}
              </p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5" />
            Course-wise Enrollment
          </CardTitle>
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
                return (
                  <Card
                    key={course.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCourse === course.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedCourse(selectedCourse === course.id ? "all" : course.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{course.name}</p>
                          <p className="text-xs text-muted-foreground">{course.code}</p>
                        </div>
                        <Badge variant="secondary" className="text-lg px-3">{counts.total}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" /> Active: {counts.active}
                        </span>
                        <span>Male: {counts.male}</span>
                        <span>Female: {counts.female}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {courses.every((c) => getCourseCounts(c.id).total === 0) && (
                <p className="col-span-full text-center text-muted-foreground py-6">
                  No students enrolled for this academic year.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Student List
              {selectedCourse !== "all" && (
                <Badge variant="outline" className="ml-2 cursor-pointer" onClick={() => setSelectedCourse("all")}>
                  {courses.find((c) => c.id === selectedCourse)?.name} ✕
                </Badge>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.profile?.full_name || "—"}</TableCell>
                      <TableCell>{s.roll_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.course?.code || "—"}</Badge>
                      </TableCell>
                      <TableCell>{s.semester || "—"}</TableCell>
                      <TableCell className="capitalize">{s.gender || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
