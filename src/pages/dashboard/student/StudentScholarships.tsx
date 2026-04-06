import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Calendar, DollarSign, ExternalLink, Search, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";

interface Scholarship {
  id: string;
  name: string;
  provider: string;
  scholarship_type: string;
  description: string;
  eligibility: string;
  eligible_courses: string[];
  amount: string;
  application_link: string;
  deadline: string | null;
  created_at: string;
}

export default function StudentScholarships() {
  const [items, setItems] = useState<Scholarship[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("scholarships").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (data) setItems(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = items.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || s.scholarship_type === typeFilter;
    return matchSearch && matchType;
  });

  const typeColors: Record<string, string> = {
    government: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    private: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    merit: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    sports: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
  };

  return (
    <>
      <SEOHead title="Scholarships" noIndex />
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Scholarships</h2>
          <p className="text-sm text-muted-foreground mt-1">Browse available scholarships and apply</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search scholarships..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="government">Government</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="merit">Merit-Based</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No scholarships available</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(s => (
              <Card key={s.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold">{s.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" /> {s.provider || "Various"}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize ${typeColors[s.scholarship_type] || ""}`}>
                      {s.scholarship_type}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                  {s.eligibility && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                      <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{s.eligibility}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {s.amount && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {s.amount}</span>}
                    {s.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline: {format(new Date(s.deadline), "dd MMM yyyy")}</span>}
                  </div>
                  {s.eligible_courses?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.eligible_courses.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                    </div>
                  )}
                  {s.application_link && (
                    <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => window.open(s.application_link, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="w-3.5 h-3.5" /> Apply
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
