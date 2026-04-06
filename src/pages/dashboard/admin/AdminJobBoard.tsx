import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Briefcase, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";

interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  job_type: string;
  location: string;
  salary_range: string;
  eligibility_courses: string[];
  application_link: string;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminJobBoard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("internship");
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [appLink, setAppLink] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    const { data } = await supabase.from("job_postings").select("*").order("created_at", { ascending: false });
    if (data) setJobs(data);
  };

  const resetForm = () => {
    setTitle(""); setCompany(""); setDescription(""); setJobType("internship");
    setLocation(""); setSalaryRange(""); setCourses([]); setAppLink(""); setDeadline("");
    setEditingJob(null);
  };

  const openEdit = (job: JobPosting) => {
    setEditingJob(job);
    setTitle(job.title); setCompany(job.company); setDescription(job.description);
    setJobType(job.job_type); setLocation(job.location || ""); setSalaryRange(job.salary_range || "");
    setCourses(job.eligibility_courses || []); setAppLink(job.application_link || "");
    setDeadline(job.deadline || "");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !company.trim()) return toast.error("Title and company required");
    const payload = {
      title, company, description, job_type: jobType, location,
      salary_range: salaryRange, eligibility_courses: courses,
      application_link: appLink, deadline: deadline || null,
      posted_by: user?.id
    };

    if (editingJob) {
      const { error } = await supabase.from("job_postings").update(payload).eq("id", editingJob.id);
      if (error) return toast.error(error.message);
      toast.success("Job posting updated");
    } else {
      const { error } = await supabase.from("job_postings").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Job posting created");
    }
    setShowDialog(false); resetForm(); fetchJobs();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("job_postings").update({ is_active: !current }).eq("id", id);
    fetchJobs();
  };

  const deleteJob = async (id: string) => {
    await supabase.from("job_postings").delete().eq("id", id);
    fetchJobs();
    toast.success("Deleted");
  };

  const toggleCourse = (code: string) => {
    setCourses(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const courseOptions = ["BCA", "BCom", "BBA", "BCom (Professional)"];
  const typeColors: Record<string, string> = {
    internship: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    full_time: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    part_time: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  };

  return (
    <>
      <SEOHead title="Job Board | Admin" noIndex />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Job & Internship Board</h2>
            <p className="text-sm text-muted-foreground mt-1">Post and manage opportunities for students</p>
          </div>
          <Dialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Post Opportunity</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
              <DialogHeader><DialogTitle>{editingJob ? "Edit" : "New"} Job/Internship</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input placeholder="e.g. Web Developer Intern" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Company *</Label>
                    <Input placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Job description..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Location</Label>
                    <Input placeholder="e.g. Bangalore / Remote" value={location} onChange={e => setLocation(e.target.value)} />
                  </div>
                  <div>
                    <Label>Salary/Stipend</Label>
                    <Input placeholder="e.g. ₹10,000/month" value={salaryRange} onChange={e => setSalaryRange(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Eligible Courses</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {courseOptions.map(c => (
                      <Badge key={c} variant={courses.includes(c) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleCourse(c)}>
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Application Link</Label>
                    <Input placeholder="https://..." value={appLink} onChange={e => setAppLink(e.target.value)} />
                  </div>
                  <div>
                    <Label>Deadline</Label>
                    <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full">{editingJob ? "Update" : "Post"} Opportunity</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No job postings yet</TableCell></TableRow>
                ) : jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[job.job_type] || ""}`}>
                        {job.job_type.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(job.eligibility_courses || []).map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{job.deadline ? format(new Date(job.deadline), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Switch checked={job.is_active} onCheckedChange={() => toggleActive(job.id, job.is_active)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(job)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteJob(job.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
