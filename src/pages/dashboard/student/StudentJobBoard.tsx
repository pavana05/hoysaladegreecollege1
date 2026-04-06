import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Calendar, DollarSign, ExternalLink, Search } from "lucide-react";
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
  created_at: string;
}

export default function StudentJobBoard() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase.from("job_postings").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (data) setJobs(data);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const filtered = jobs.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || j.job_type === typeFilter;
    return matchSearch && matchType;
  });

  const typeColors: Record<string, string> = {
    internship: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    full_time: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    part_time: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  };

  return (
    <>
      <SEOHead title="Job & Internship Board" description="Browse job opportunities" noIndex />
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Job & Internship Board</h2>
          <p className="text-sm text-muted-foreground mt-1">Explore opportunities relevant to your course</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No opportunities found</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(job => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold">{job.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" /> {job.company}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${typeColors[job.job_type] || ""}`}>
                      {job.job_type.replace("_", " ")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.description && <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                    {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary_range}</span>}
                    {job.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline: {format(new Date(job.deadline), "dd MMM yyyy")}</span>}
                  </div>
                  {job.eligibility_courses?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.eligibility_courses.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                    </div>
                  )}
                  {job.application_link && (
                    <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => window.open(job.application_link, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="w-3.5 h-3.5" /> Apply Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
